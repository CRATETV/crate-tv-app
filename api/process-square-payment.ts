import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { LOGO_URL_ON_DARK } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side price map in cents for strictly static platform fees.
const staticPriceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  crateFestPass: 1500,
  juryPass: 2500,
};

// Atomically reserves one capacity slot for a block, if the block has a
// capacity set. This used to be a plain read ("is ticketsSold >= capacity?")
// followed, much later, by a separate non-transactional read-modify-write on
// the same array field — two buyers racing for the last seat could both pass
// the check and both get charged, overselling. Doing the check-and-increment
// inside a single Firestore transaction means Firestore itself serializes
// concurrent attempts: only as many callers as there are remaining seats can
// ever succeed, everyone else gets a clean "sold out" error before their
// card is charged. Blocks can live in either the festival day docs or the
// CrateFest settings doc, so both are checked. Returns null if itemId isn't
// a known block at all (nothing to reserve — e.g. a plain movie/VOD).
async function reserveBlockCapacity(db: FirebaseFirestore.Firestore, itemId: string) {
  const daysColRef = db.collection('festival').doc('schedule').collection('days');
  const settingsRef = db.collection('settings').doc('site');

  return db.runTransaction(async (tx) => {
    const daysSnap = await tx.get(daysColRef);
    for (const dayDoc of daysSnap.docs) {
      const day = dayDoc.data();
      const blocks: any[] = day.blocks || [];
      const idx = blocks.findIndex((b: any) => b.id === itemId);
      if (idx === -1) continue;

      const block = blocks[idx];
      if (!block.capacity) return { blockData: block, release: null as (() => Promise<void>) | null };
      if ((block.ticketsSold || 0) >= block.capacity) throw new Error('This block is sold out.');

      const updated = [...blocks];
      updated[idx] = { ...block, ticketsSold: (block.ticketsSold || 0) + 1 };
      tx.update(dayDoc.ref, { blocks: updated });

      return {
        blockData: block,
        release: async () => {
          try {
            await db.runTransaction(async (tx2) => {
              const snap = await tx2.get(dayDoc.ref);
              const bs: any[] = snap.data()?.blocks || [];
              const i2 = bs.findIndex((b: any) => b.id === itemId);
              if (i2 === -1) return;
              const upd = [...bs];
              upd[i2] = { ...upd[i2], ticketsSold: Math.max(0, (upd[i2].ticketsSold || 0) - 1) };
              tx2.update(dayDoc.ref, { blocks: upd });
            });
          } catch (e) { console.error(`[Payment API] Failed to release capacity for ${itemId}:`, e); }
        },
      };
    }

    // Not a PWFF block — check the CrateFest config, which stores its
    // blocks as an array field on a single settings doc instead.
    const settingsSnap = await tx.get(settingsRef);
    const crateFestBlocks: any[] = settingsSnap.data()?.crateFestConfig?.movieBlocks || [];
    const cIdx = crateFestBlocks.findIndex((b: any) => b.id === itemId);
    if (cIdx === -1) return null;

    const block = crateFestBlocks[cIdx];
    if (!block.capacity) return { blockData: block, release: null as (() => Promise<void>) | null };
    if ((block.ticketsSold || 0) >= block.capacity) throw new Error('This block is sold out.');

    const updated = [...crateFestBlocks];
    updated[cIdx] = { ...block, ticketsSold: (block.ticketsSold || 0) + 1 };
    tx.update(settingsRef, { 'crateFestConfig.movieBlocks': updated });

    return {
      blockData: block,
      release: async () => {
        try {
          await db.runTransaction(async (tx2) => {
            const snap = await tx2.get(settingsRef);
            const bs: any[] = snap.data()?.crateFestConfig?.movieBlocks || [];
            const i2 = bs.findIndex((b: any) => b.id === itemId);
            if (i2 === -1) return;
            const upd = [...bs];
            upd[i2] = { ...upd[i2], ticketsSold: Math.max(0, (upd[i2].ticketsSold || 0) - 1) };
            tx2.update(settingsRef, { 'crateFestConfig.movieBlocks': upd });
          });
        } catch (e) { console.error(`[Payment API] Failed to release capacity for ${itemId}:`, e); }
      },
    };
  });
}

export async function POST(request: Request) {
  // Set only if a capacity reservation was actually made below — released
  // in the catch block if the payment ends up failing after the reservation
  // succeeded, so a failed charge never permanently occupies a seat.
  let releaseCapacityReservation: (() => Promise<void>) | null = null;
  try {
    // No throttling existed on the endpoint that actually charges a card —
    // a script could otherwise hammer this with rapid repeated attempts
    // (e.g. testing many stolen card numbers). 6 attempts per 5 minutes per
    // IP comfortably covers a real customer retrying a declined card.
    const ip = getIP(request);
    if (!rateLimit(`process-payment:${ip}`, 6, 5 * 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many payment attempts. Please wait a few minutes and try again.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { sourceId, amount, movieTitle, directorName, paymentType, itemId, blockTitle, email, uid, promoCode } = await request.json();
    
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
        // Look up the block's actual admin-configured price — this used to be
        // hardcoded to a flat $10 for every block regardless of what was set
        // in the Festival Hub, which either overcharged or undercharged
        // customers depending on the block's real price. Same lookup pattern
        // as the 'movie'/'watchPartyTicket' branch above.
        if (!db) throw new Error("Database offline.");
        if (!itemId) throw new Error("Missing block id.");

        // Capacity is optional — most blocks have none set, meaning
        // unlimited (the original, unchanged behavior). Only enforced when
        // an admin has explicitly set a cap on this specific block. This
        // check-and-reserve happens atomically, before the card is ever
        // charged, so a sold-out block never takes anyone's money AND two
        // simultaneous buyers can never both claim the last seat.
        const reservation = await reserveBlockCapacity(db, itemId);
        if (!reservation) throw new Error("Item record not found.");
        const blockData = reservation.blockData;
        releaseCapacityReservation = reservation.release;

        amountInCents = Math.round((blockData?.price ?? 10.00) * 100);
        note = `Unlock Block: ${blockData?.title || blockTitle || itemId}`;
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
                    <div style="background: #0a0a0a; padding: 24px; text-align: center;">
                        <img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="110" style="display: inline-block; border: 0; margin-bottom: 12px;" />
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
                    <img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="100" style="display: block; border: 0; margin-bottom: 20px;" />
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

    // --- LOG TICKET SALE FOR FESTIVAL REPORTING ---
    if (db && (paymentType === 'watchPartyTicket' || paymentType === 'block' || paymentType === 'movie')) {
        try {
            await db.collection('festival_tickets').add({
                itemId,
                paymentType,
                note,
                amountPaid: amountInCents / 100,
                email: email || null,
                promoCode: promoCode || null,
                purchasedAt: FieldValue.serverTimestamp(),
                isWatchParty: paymentType === 'watchPartyTicket',
                isFestivalBlock: paymentType === 'block',
                uid: uid || null,
            });
        } catch (e) {
            console.error('[Payment API] Failed to log ticket sale:', e);
        }
    }

    // --- SERVER-SIDE UNLOCK — write access to user's Firestore doc ---
    // This is done server-side (Admin SDK) because Firestore security rules
    // block clients from writing payment/access fields directly.
    if (db && uid && paymentType === 'block' && itemId) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 14); // 2 weeks access
            const userRef = db.collection('users').doc(uid);
            await userRef.set({
                unlockedBlocks: { [itemId]: expirationDate.toISOString() }
            }, { merge: true });
            console.log(`[Payment API] Unlocked block ${itemId} for user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to unlock block for user:', e);
        }
        // ticketsSold is already incremented atomically by reserveBlockCapacity
        // above, before the card was charged — nothing further to do here.
    }

    // All-access pass — unlock all blocks
    if (db && uid && itemId === 'full-festival-pass') {
        try {
            await db.collection('users').doc(uid).set({
                hasFestivalAllAccess: true,
                festivalAllAccessGrantedAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`[Payment API] Granted festival all-access to user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant all-access:', e);
        }
    }

    // CrateFest pass / Jury pass — these were charged correctly (see
    // staticPriceMap above) but never actually granted anything server-side.
    // The only place that ever set hasCrateFestPass/hasJuryPass was a direct
    // client-side Firestore write (AuthContext's grantCrateFestPass/
    // grantJuryPass), which is exactly the kind of write firestore.rules now
    // blocks — meaning anyone paying for either of these got charged and
    // received nothing. Same fix pattern as every other grant in this file.
    if (db && uid && paymentType === 'crateFestPass') {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 14);
            await db.collection('users').doc(uid).set({
                hasCrateFestPass: true,
                crateFestPassExpiry: expirationDate.toISOString(),
            }, { merge: true });
            console.log(`[Payment API] Granted CrateFest pass to user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant CrateFest pass:', e);
        }
    }

    if (db && uid && paymentType === 'juryPass') {
        try {
            await db.collection('users').doc(uid).set({
                hasJuryPass: true,
            }, { merge: true });
            console.log(`[Payment API] Granted Jury Pass to user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant Jury Pass:', e);
        }
    }

    // Premium subscription — same gap as CrateFest/Jury pass: charged
    // correctly (see staticPriceMap above) but the only thing that ever set
    // isPremiumSubscriber was a direct client-side write (AuthContext's
    // subscribe()), which firestore.rules blocks. Grant it here instead.
    if (db && uid && paymentType === 'subscription') {
        try {
            await db.collection('users').doc(uid).set({
                isPremiumSubscriber: true,
            }, { merge: true });
            console.log(`[Payment API] Granted premium subscription to user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant subscription:', e);
        }
    }

    // VOD rental — unlock individual film
    if (db && uid && paymentType === 'movie' && itemId) {
        try {
            const rentalExpiry = new Date();
            rentalExpiry.setDate(rentalExpiry.getDate() + 7); // 7 days
            await db.collection('users').doc(uid).set({
                rentals: { [itemId]: rentalExpiry.toISOString() }
            }, { merge: true });
            console.log(`[Payment API] Unlocked rental ${itemId} for user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to unlock rental:', e);
        }
    }

    // Watch party ticket — this was the one payment type that got charged
    // correctly above but never actually granted anything server-side. The
    // only place that ever unlocked it was a direct client-side Firestore
    // write (AuthContext's unlockWatchParty), which is exactly the kind of
    // write firestore.rules now blocks — so this grant has to happen here,
    // the same way the block/movie grants already do.
    if (db && uid && paymentType === 'watchPartyTicket' && itemId) {
        try {
            const userRef = db.collection('users').doc(uid);
            const userDoc = await userRef.get();
            const existing: string[] = userDoc.data()?.unlockedWatchPartyKeys || [];
            if (!existing.includes(itemId)) {
                await userRef.set({
                    unlockedWatchPartyKeys: [...existing, itemId]
                }, { merge: true });
            }
            console.log(`[Payment API] Unlocked watch party ${itemId} for user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to unlock watch party:', e);
        }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // If a capacity slot was reserved but something failed afterward (card
    // declined, network error, etc.), give the seat back — otherwise a
    // failed payment would permanently count against capacity.
    if (releaseCapacityReservation) {
      await releaseCapacityReservation();
    }
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Payment failures are the highest-priority thing to know about immediately.
    logServerError('api/process-square-payment', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}