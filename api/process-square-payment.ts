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
        if (!movieDoc.exists) throw new Error("Item record not found.");
        const movieData = movieDoc.data();
        
        const rawPrice = paymentType === 'movie' ? (movieData?.salePrice || 5.00) : (movieData?.watchPartyPrice || 5.00);
        amountInCents = Math.round(rawPrice * 100);
        note = `${paymentType === 'movie' ? 'VOD Rental' : 'Watch Party Ticket'}: ${movieData?.title || itemId}`;
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
    
    // Receipt notification
    if (email && process.env.RESEND_API_KEY) {
        try {
            const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: `Secure Auth: ${note}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
                        <h1 style="color: #ef4444; text-transform: uppercase;">Transaction Complete</h1>
                        <p>Your access vector has been successfully authorized.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p><strong>Resource:</strong> ${note}</p>
                        <p><strong>Amount:</strong> ${amountFormatted}</p>
                        ${promoCode ? `<p style="font-size: 11px; color: #999;">Voucher Applied: ${promoCode}</p>` : ''}
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 11px; color: #666;">This resource is now unlocked on your global account profile.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error("[Payment API] Failed to send receipt:", emailError);
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