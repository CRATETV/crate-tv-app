import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side price map in cents for strictly static platform fees.
const staticPriceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  crateFestPass: 1500,
  juryPass: 2500,
};

export async function POST(request: Request) {
  try {
    const { sourceId, amount, movieTitle, directorName, paymentType, itemId, blockTitle, email, promoCode } = await request.json();
    
    const isProduction = process.env.VERCEL_ENV === 'production';
    const accessToken = isProduction
      ? process.env.SQUARE_ACCESS_TOKEN
      : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    
    const locationId = isProduction
      ? process.env.SQUARE_LOCATION_ID
      : process.env.SQUARE_SANDBOX_LOCATION_ID;

    if (!accessToken || !locationId) {
      throw new Error(`Square configuration is missing on the server.`);
    }

    if (!sourceId || !paymentType) {
      return new Response(JSON.stringify({ error: "Missing required payment information." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    const db = !initError ? getAdminDb() : null;

    // --- PROMO CODE INTEGRITY CHECK ---
    if (promoCode && db) {
        const promoRef = db.collection('promo_codes').doc(promoCode.toUpperCase().trim());
        const promoDoc = await promoRef.get();
        if (promoDoc.exists) {
            const promoData = promoDoc.data();
            if (promoData && promoData.usedCount >= promoData.maxUses) {
                return new Response(JSON.stringify({ error: "This promo code has reached its maximum usage limit." }), { status: 403 });
            }
        }
    }

    const idempotencyKey = randomUUID();
    let amountInCents: number = 0;
    let note: string = "Crate TV Purchase";

    // --- PRICING LOGIC ---
    if (['donation', 'billSavingsDeposit'].includes(paymentType)) {
        // User-defined amounts
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100 && sourceId !== 'PROMO_VOUCHER') { 
            throw new Error("Amount must be at least $1.00.");
        }
        note = paymentType === 'donation' ? `Support for film: "${movieTitle}"` : 'Bill Savings Deposit';
    } 
    else if (paymentType === 'movie' || paymentType === 'watchPartyTicket') {
        // Fetch source of truth from DB to prevent tampering
        if (!db) throw new Error("Database offline.");
        const movieDoc = await db.collection('movies').doc(itemId).get();
        
        if (!movieDoc.exists) {
            // Check if it's a festival block
            const festSnap = await db.collection('festival').doc('schedule').collection('days').get();
            let blockData: any = null;
            festSnap.forEach(doc => {
                const day = doc.data();
                const found = day.blocks?.find((b: any) => b.id === itemId);
                if (found) blockData = found;
            });

            // Also check CrateFest config
            if (!blockData) {
                const settingsDoc = await db.collection('settings').doc('site').get();
                const crateFestBlocks = settingsDoc.data()?.crateFestConfig?.movieBlocks || [];
                blockData = crateFestBlocks.find((b: any) => b.id === itemId);
            }
            
            if (blockData) {
                amountInCents = Math.round((blockData.price || 10.00) * 100);
                note = `Watch Party Ticket (Block): ${blockData.title || itemId}`;
            } else {
                throw new Error("Item record not found.");
            }
        } else {
            const movieData = movieDoc.data();
            const rawPrice = paymentType === 'movie' ? (movieData?.salePrice || 5.00) : (movieData?.watchPartyPrice || 5.00);
            amountInCents = Math.round(rawPrice * 100);
            note = `${paymentType === 'movie' ? 'VOD Rental' : 'Watch Party Ticket'}: ${movieData?.title || itemId}`;
        }
    }
    else if (paymentType === 'block') {
        amountInCents = 1000; // Fixed $10 for blocks currently
        note = `Unlock Block: ${blockTitle || itemId}`;
    }
    else if (staticPriceMap[paymentType]) {
        amountInCents = staticPriceMap[paymentType];
        note = `Platform ${paymentType.replace(/([A-Z])/g, ' $1')}`;
    }
    else {
        throw new Error("Invalid access vector specified.");
    }

    // --- APPLY VOUCHER DISCOUNT (If any) ---
    if (promoCode && db) {
        const promoRef = db.collection('promo_codes').doc(promoCode.toUpperCase().trim());
        const promoDoc = await promoRef.get();
        if (promoDoc.exists) {
            const promo = promoDoc.data();
            if (promo?.type === 'one_time_access') amountInCents = 0;
            else if (promo?.type === 'discount') amountInCents = Math.round(amountInCents * ((100 - promo.discountValue) / 100));
        }
    }

    // --- PROCESS TRANSACTION ---
    if (amountInCents > 0 && sourceId !== 'PROMO_VOUCHER') {
        const squareUrl = isProduction 
          ? 'https://connect.squareup.com/v2/payments' 
          : 'https://connect.squareupsandbox.com/v2/payments';

        const response = await fetch(squareUrl, {
          method: 'POST',
          headers: {
            'Square-Version': '2024-05-15',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_id: sourceId,
            idempotency_key: idempotencyKey,
            location_id: locationId,
            amount_money: {
              amount: amountInCents,
              currency: 'USD',
            },
            note: note,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || 'Payment failed.';
            throw new Error(errorMessage);
        }
    }

    // --- FINALIZE PROMO CODE USAGE ---
    if (promoCode && db) {
        await db.collection('promo_codes').doc(promoCode.toUpperCase().trim()).update({
            usedCount: FieldValue.increment(1)
        });
    }
    
    // Receipt / confirmation email
    if (email && process.env.RESEND_API_KEY) {
        try {
            const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            const isWatchParty = paymentType === 'watchPartyTicket';
            
            // Build watch party specific details
            const watchPartyUrl = isWatchParty && itemId
                ? `${process.env.VITE_APP_URL || 'https://cratetv.net'}/watchparty/${itemId}`
                : null;
            
            // Get movie details for watch party confirmation
            let movieTitle = note;
            let watchPartyTime = '';
            if (isWatchParty && itemId && db) {
                try {
                    const movieDoc = await db.collection('movies').doc(itemId).get();
                    if (movieDoc.exists) {
                        const movieData = movieDoc.data();
                        movieTitle = movieData?.title || note;
                        if (movieData?.watchPartyStartTime) {
                            const startDate = new Date(movieData.watchPartyStartTime);
                            watchPartyTime = startDate.toLocaleString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long',
                                day: 'numeric', hour: '2-digit', minute: '2-digit',
                                timeZoneName: 'short'
                            });
                        }
                    }
                } catch (e) { /* silent */ }
            }

            const emailHtml = isWatchParty ? `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
                    <div style="background: #E50914; padding: 24px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase; color: white; opacity: 0.8;">Crate TV</p>
                        <h1 style="margin: 8px 0 0; font-size: 28px; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: -0.02em;">You're In.</h1>
                    </div>
                    <div style="padding: 36px 32px;">
                        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin: 0 0 8px;">Watch Party Ticket Confirmed</p>
                        <h2 style="font-size: 24px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase;">${movieTitle}</h2>
                        ${watchPartyTime ? `
                        <div style="background: #1a1a1a; border-left: 3px solid #E50914; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #666;">Screening Time</p>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: white;">${watchPartyTime}</p>
                        </div>` : ''}
                        ${watchPartyUrl ? `
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${watchPartyUrl}" style="display: inline-block; background: #E50914; color: white; font-weight: 900; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 40px; border-radius: 8px; text-decoration: none;">Enter Watch Party</a>
                            <p style="margin: 12px 0 0; font-size: 11px; color: #555;">${watchPartyUrl}</p>
                        </div>` : ''}
                        <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
                        <p style="font-size: 12px; color: #555; margin: 0;">Amount paid: ${amountFormatted} ${promoCode ? `· Voucher applied: ${promoCode}` : ''}</p>
                        <p style="font-size: 11px; color: #444; margin: 8px 0 0;">Your ticket is linked to your Crate TV account and will be available on all your devices.</p>
                    </div>
                </div>
            ` : `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden; padding: 32px;">
                    <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #E50914; margin: 0 0 8px;">Crate TV</p>
                    <h1 style="font-size: 22px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase;">Access Confirmed</h1>
                    <p style="color: #888; margin: 0 0 16px;"><strong style="color: white;">Resource:</strong> ${note}</p>
                    <p style="color: #888; margin: 0 0 24px;"><strong style="color: white;">Amount:</strong> ${amountFormatted}</p>
                    ${promoCode ? `<p style="font-size: 11px; color: #555;">Voucher applied: ${promoCode}</p>` : ''}
                    <p style="font-size: 11px; color: #555; margin: 0;">This resource is now unlocked on your Crate TV account.</p>
                </div>
            `;

            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: isWatchParty
                    ? `Your ticket for ${movieTitle} — Crate TV Watch Party`
                    : `Access confirmed: ${note}`,
                html: emailHtml,
            });
        } catch (emailError) {
            console.error("[Payment API] Failed to send confirmation:", emailError);
        }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}