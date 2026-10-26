import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { isPastAvailableUntil } from './_lib/filmAvailability.js';
import { Firestore } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { LOGO_URL_ON_DARK, renderBrandedEmail } from './_lib/emailBranding.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';
import { isFestivalPassActive, laterExpiry, festivalPassOnSale, festivalPassExpiryFor, blockSaleClosed, partnerPassIsCurrent } from './_lib/festivalPass.js';
import { getPwffBlocks } from './_lib/festivalTiming.js';
import { escapeHtml } from './_lib/validation.js';
import { promoProblem, priceAfterPromo, payWhatYouWantCents, PWYW_MIN_DOLLARS, PREMIERE_PRICES_CENTS, PREMIERE_LABELS, isPremierePayment } from './_lib/paymentRules.js';
import { cleanLine } from './_lib/validation.js';
import { blockAccessExpiry } from './_lib/watchPartyLifecycle.js';
import { partnerIdFromPassItem, isOutsidePartner } from './_lib/partnerRules.js';
import { getPartner, getPublishedBlocks, grantBlocksToUser } from './_lib/partners.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side price map in cents for strictly static platform fees.
const staticPriceMap: Record<string, number> = {
  subscription: 499,
  crateFestPass: 1500,
};

const FULL_PASS_ITEM = 'full-festival-pass';
const MAX_DONATION_CENTS = 1_000_000; // $10,000


// A regular standalone catalog rental (e.g. LUNA once detached from its
// festival block) is a short 2-day window from purchase, not a full
// week — confirmed explicitly: "titles that customers pay for like Luna
// its available for 2 days. after 2 days they have to repay to watch.
// that way we can keep generating revenue." Applies sitewide to every
// standalone paid title, present and future, not just LUNA specifically.
//
// A festival film still on its block is different: access is meant to
// end when the festival's own rewatch window closes, not a fresh window
// from whenever within that period someone happened to buy it —
// confirmed explicitly: "access to film festival films except LUNA
// expire today [when the festival's week is over]. it dosen't stay live
// a week from when they bought it. it stays live a week after the
// festival." A film exempted via keepInCatalogAfterFestival (e.g. LUNA)
// is a normal standalone catalog title once detached from its block, so
// it gets the standard 2-day rule like any other regular rental.
const STANDARD_RENTAL_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

async function computeRentalExpiry(db: Firestore, movieKey: string): Promise<Date> {
    const standard = new Date(Date.now() + STANDARD_RENTAL_WINDOW_MS);

    try {
        const movieDoc = await db.collection('movies').doc(movieKey).get();
        const movie = movieDoc.data();
        if (!movie?.isFestival || movie?.keepInCatalogAfterFestival) return standard;

        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        let blockCutoffMs: number | null = null;
        daysSnap.forEach(dayDoc => {
            for (const block of (dayDoc.data().blocks || [])) {
                if (!(block.movieKeys || []).includes(movieKey)) continue;
                const ref = block.festivalEndTime || block.screeningStartTime;
                if (!ref) continue;
                const t = new Date(ref).getTime();
                if (isNaN(t)) continue;
                const cutoff = t + FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS;
                if (blockCutoffMs === null || cutoff > blockCutoffMs) blockCutoffMs = cutoff;
            }
        });

        // No block found (already detached, or data gap) — fall back to
        // the standard window rather than granting an unintentionally-
        // permanent rental.
        if (blockCutoffMs === null) return standard;
        // Never grant MORE than the standard window even if the festival
        // cutoff is somehow further out (e.g. someone buying right as the
        // festival opens) — this only ever shortens the window, never
        // extends it.
        return new Date(Math.min(blockCutoffMs, standard.getTime()));
    } catch (e) {
        console.error('[Payment API] computeRentalExpiry fallback to standard window:', e);
        return standard;
    }
}

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
  // The block being bought (paymentType 'block'), kept for the access-expiry calculation.
  let purchasedBlockData: any = null;
  // Partner festival (Festival in a box) this purchase belongs to, if any —
  // stamped on the ticket record so the partner's sales report finds it.
  let purchasePartnerId: string | null = null;
  let partnerPassBlocks: any[] | null = null;
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

    const body = await request.json();
    const { sourceId, amount, movieTitle, directorName, itemId, blockTitle, idempotencyKey: clientIdempotencyKey } = body;
    let paymentType: string = body.paymentType;
    const email: string | null = typeof body.email === 'string' && body.email.includes('@') ? body.email.trim().slice(0, 200) : null;
    const promoCode: string | null = typeof body.promoCode === 'string' && body.promoCode.trim() ? body.promoCode.toUpperCase().trim().slice(0, 60) : null;

    // LOOPHOLE (Oct 2026 audit): the full pass used to be granted for ANY
    // payment type that carried itemId "full-festival-pass", so a $4.99
    // "subscription" or a $1 "donation" with that id unlocked the whole
    // festival. The full pass is now only ever sold as itself.
    if (paymentType === 'pass') {
        if (itemId !== FULL_PASS_ITEM) {
            return new Response(JSON.stringify({ error: 'Invalid pass.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        paymentType = 'block';
    }
    if (itemId === FULL_PASS_ITEM && paymentType !== 'block') {
        return new Response(JSON.stringify({ error: 'Invalid pass.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Donations and deposits never take promo codes.
    if (promoCode && ['donation', 'billSavingsDeposit'].includes(paymentType)) {
        return new Response(JSON.stringify({ error: "Promo codes can't be used here." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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

    // --- VERIFY CALLER IDENTITY ---
    // `uid` used to come straight from the request body — anyone could send
    // any uid they liked (their own, a friend's, one just guessed) and this
    // endpoint would grant paid access to THAT account instead of whoever
    // actually paid, with nothing to stop it. A donation/support-pot deposit
    // never grants account-scoped access below, so it can stay anonymous;
    // every other payment type does grant access keyed to `uid`, so those
    // require a verified Firebase ID token — the uid used everywhere below
    // comes only from that token, never from the request body.
    let uid: string | null = null;
    const authHeader = request.headers.get('Authorization');
    const requiresAuth = !['donation', 'billSavingsDeposit'].includes(paymentType);
    if (authHeader?.startsWith('Bearer ')) {
        const auth = getAdminAuth();
        if (!auth) {
            if (requiresAuth) throw new Error('Authentication service unavailable.');
        } else {
            try {
                uid = (await auth.verifyIdToken(authHeader.slice(7))).uid;
            } catch {
                return new Response(JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }), {
                    status: 401, headers: { 'Content-Type': 'application/json' },
                });
            }
        }
    }
    if (requiresAuth && !uid) {
        return new Response(JSON.stringify({ error: 'Sign in required to complete this purchase.' }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    // A "watch party ticket" for a festival BLOCK is a block ticket. It used
    // to be saved as a permanent party ticket instead, so it never expired
    // like every other block ticket (Oct 2026 audit).
    if (paymentType === 'watchPartyTicket' && db && itemId && typeof itemId === 'string') {
        const isFilm = (await db.collection('movies').doc(itemId).get()).exists;
        if (!isFilm) paymentType = 'block';
    }

    // --- DUPLICATE PURCHASE GUARD ---
    // FIX (real customer overcharge — Bret Sperry was charged 3x for one
    // "Tino" rental): a client-side bug let the checkout modal be dismissed
    // right after a successful payment but before the app learned about it,
    // so the film still looked locked and he reasonably paid again. That
    // client bug is fixed separately (SquarePaymentModal.tsx), but this is
    // the actual backstop: if the signed-in user already has whatever this
    // exact purchase would grant, don't charge them again no matter what the
    // client thinks the state is. Originally only covered movie rentals —
    // extended to every access-granting payment type below (blocks, watch
    // party tickets, and every kind of pass), since a stale client, a
    // double-click, or a retried request could double-charge any of them
    // the same way.
    if (db && uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            const userData = userDoc.data();

            const alreadyHasAccess = await (async () => {
                if (paymentType === 'movie' && itemId) {
                    const expiry = userData?.rentals?.[itemId];
                    return !!expiry && new Date(expiry) > new Date();
                }
                if (paymentType === 'watchPartyTicket' && itemId) {
                    return (userData?.unlockedWatchPartyKeys || []).includes(itemId);
                }
                if (paymentType === 'block' && itemId) {
                    if (itemId === FULL_PASS_ITEM) return isFestivalPassActive(userData);
                    const passPartner = partnerIdFromPassItem(itemId);
                    if (passPartner) {
                        // Only THIS year's partner pass counts (last year's mustn't block a new purchase).
                        const granted = userData?.partnerPasses?.[passPartner];
                        if (!granted) return false;
                        const partner = await getPartner(db, passPartner);
                        const cleanedAt = Date.parse(String(partner?.cleanup?.deletedAt || '')) || null;
                        return partnerPassIsCurrent(Date.parse(String(granted)) || null, cleanedAt);
                    }
                    const expiry = userData?.unlockedBlocks?.[itemId];
                    if ((userData?.unlockedWatchPartyKeys || []).includes(itemId)) return true; // older ticket for this block
                    return !!expiry && new Date(expiry) > new Date();
                }
                if (paymentType === 'crateFestPass') {
                    const expiry = userData?.crateFestPassExpiry;
                    return !!userData?.hasCrateFestPass && (!expiry || new Date(expiry) > new Date());
                }
                if (paymentType === 'subscription') return !!userData?.isPremiumSubscriber;
                return false;
            })();

            if (alreadyHasAccess) {
                return new Response(JSON.stringify({
                    error: "You already have access to this — no need to pay again.",
                    alreadyRented: true,
                }), { status: 409, headers: { 'Content-Type': 'application/json' } });
            }
        } catch (e) {
            // If this check itself fails, fall through and let the payment
            // proceed rather than blocking a legitimate first-time purchase —
            // this guard should only ever prevent a charge, never cause one
            // to be wrongly rejected.
            console.error('[Payment API] Duplicate purchase check failed (proceeding):', e);
        }
    }

    // --- PROMO CODE CHECK ---
    // Every rule is checked here, before any charge: the code exists, isn't
    // used up or expired, and fits this item. (An unknown code used to be
    // charged at full price and THEN crash while counting its use, so the
    // buyer paid and got nothing; expiry was only checked by the "apply"
    // button, never at checkout.)
    let promo: any = null;
    if (promoCode) {
        if (!db) throw new Error('Database offline.');
        promo = (await db.collection('promo_codes').doc(promoCode).get()).data() || null;
        const problem = promoProblem(promo, itemId);
        if (problem) return new Response(JSON.stringify({ error: problem }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Reuses the client's own idempotency key for this checkout attempt
    // (one generated once per SquarePaymentModal mount) instead of a fresh
    // randomUUID() every call — a double-click firing two requests for the
    // same attempt now sends the SAME key to Square, which dedupes them
    // into a single charge instead of two. A missing/malformed key (an old
    // client, or a direct API call) still gets a random one so the request
    // doesn't fail outright, it just loses the double-click protection.
    const idempotencyKey = (typeof clientIdempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(clientIdempotencyKey))
        ? clientIdempotencyKey
        : randomUUID();
    let amountInCents: number = 0;
    let note: string = "Crate TV Purchase";

    // --- PRICING LOGIC ---
    // Premiere night payments (cratetv.net/book-premiere): fixed prices, no promo codes.
    const premiereFilm = isPremierePayment(paymentType) ? cleanLine(movieTitle, 150) : '';
    if (isPremierePayment(paymentType)) {
        if (promo) return new Response(JSON.stringify({ error: 'Promo codes can\'t be used for premiere bookings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        if (!premiereFilm) return new Response(JSON.stringify({ error: 'Please add your film\'s title.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        amountInCents = PREMIERE_PRICES_CENTS[paymentType];
        note = `${PREMIERE_LABELS[paymentType]}: ${premiereFilm}`.slice(0, 200);
    }
    else if (['donation', 'billSavingsDeposit'].includes(paymentType)) {
        // User-defined amounts
        amountInCents = Math.round(Number(amount) * 100);
        // A non-number amount ("abc") used to become NaN, slip past the $1
        // check and skip the charge entirely.
        if (!Number.isFinite(amountInCents) || amountInCents < 100 || amountInCents > MAX_DONATION_CENTS) {
            return new Response(JSON.stringify({ error: 'Please enter an amount between $1 and $10,000.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        note = paymentType === 'donation' ? `Support for film: "${String(movieTitle || '').slice(0, 120)}"` : 'Bill Savings Deposit';
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
                // ?? not || — a block deliberately priced at $0 is free, not $10.
                amountInCents = Math.round((blockData.price ?? 10.00) * 100);
                purchasePartnerId = blockData.partnerId || null;
                note = `Watch Party Ticket (Block): ${blockData.title || itemId}`;
            } else {
                throw new Error("Item record not found.");
            }
        } else {
            const movieData = movieDoc.data();
            purchasePartnerId = movieData?.partnerId || null;
            // "Hide automatically after" has passed: the film is off CRATE, so
            // never sell it (api/_lib/filmAvailability.ts).
            if (isPastAvailableUntil(movieData as any, Date.now())) {
                return new Response(JSON.stringify({ error: 'This film is no longer available on CRATE.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            // A paid watch party film that isn't for sale on its own is sold
            // only as a party ticket. A $5 "rental" of it used to be possible by
            // calling this endpoint directly (Oct 23 2026). Festival films stay
            // rentable: their block decides that, as before.
            if (paymentType === 'movie' && movieData?.isWatchPartyPaid === true && movieData?.isForSale !== true) {
                const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
                const inFestivalBlock = daysSnap.docs.some(d => (d.data().blocks || []).some((b: any) => Array.isArray(b?.movieKeys) && b.movieKeys.includes(itemId)));
                if (!inFestivalBlock) {
                    return new Response(JSON.stringify({ error: 'This film is shown as a paid watch party. Please buy a watch party ticket instead.' }), { status: 400 });
                }
            }
            // A festival film whose festival window is already over would get a
            // rental that ends immediately: never charge for that.
            if (paymentType === 'movie') {
                const exp = await computeRentalExpiry(db, itemId);
                if (exp.getTime() < Date.now() + 60 * 60_000) {
                    return new Response(JSON.stringify({ error: 'This film is no longer available to rent.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                }
            }
            const rawPrice = paymentType === 'movie' ? (movieData?.salePrice || 5.00) : (movieData?.watchPartyPrice || 5.00);
            amountInCents = Math.round(rawPrice * 100);
            note = `${paymentType === 'movie' ? 'VOD Rental' : 'Watch Party Ticket'}: ${movieData?.title || itemId}`;
            // Pay what you want: the viewer's amount, checked here (never trusted
            // as-is): a real number from the minimum up. No promo codes on top.
            if (paymentType === 'watchPartyTicket' && movieData?.isWatchPartyPaid === true && movieData?.watchPartyPayWhatYouWant === true) {
                const chosen = payWhatYouWantCents(amount);
                if (chosen == null) {
                    return new Response(JSON.stringify({ error: `Please choose an amount of at least $${PWYW_MIN_DOLLARS}.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                }
                if (promo) {
                    return new Response(JSON.stringify({ error: "Promo codes can't be used on pay-what-you-want tickets." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                }
                amountInCents = chosen;
                note = `Watch Party Ticket (pay what you want): ${movieData?.title || itemId}`;
            }
        }
    }
    else if (paymentType === 'block') {
        if (!db) throw new Error("Database offline.");
        if (!itemId) throw new Error("Missing block id.");

        const passPartnerId = partnerIdFromPassItem(itemId);
        // PWFF's committee lineup is covered by the PWFF all-access pass
        // ("full-festival-pass" below), never a separate partner pass.
        if (passPartnerId && !isOutsidePartner(passPartnerId)) throw new Error("This festival pass isn't on sale.");
        if (passPartnerId) {
            // Festival pass for a partner festival: price comes from the
            // partner's PUBLISHED details, never from the browser.
            const partner = await getPartner(db, passPartnerId);
            const passPrice = partner?.status === 'active' ? partner?.published?.details?.passPrice : 0;
            if (!partner || !passPrice || passPrice <= 0) throw new Error("This festival pass isn't on sale.");
            partnerPassBlocks = await getPublishedBlocks(db, partner.id);
            if (!partnerPassBlocks.length) throw new Error("This festival pass isn't on sale yet.");
            amountInCents = Math.round(passPrice * 100);
            note = `Festival Pass: ${partner.published?.details?.title || partner.name}`;
            purchasePartnerId = partner.id;
        } else if (itemId === FULL_PASS_ITEM) {
            // Only while a festival with real screening times is coming up or
            // running (see festivalPass.ts) — never "early" with no end date.
            const pwffBlocks = await getPwffBlocks(db);
            const sale = festivalPassOnSale(pwffBlocks, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);
            if (!sale.onSale) {
                return new Response(JSON.stringify({ error: sale.reason }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            // The "Buy Full Festival Pass" button (PwffPage.tsx) builds a
            // synthetic block-shaped object client-side purely to reuse the
            // existing ticket-purchase UI — it was never written to
            // Firestore anywhere, so reserveBlockCapacity below could never
            // find it and every single purchase attempt failed right here
            // with "Item record not found," before the card was ever
            // charged. This mirrors the exact price the client already
            // shows, and skips capacity checking entirely since an
            // all-access pass isn't tied to any one screening's seat count.
            const settingsDoc = await db.collection('content').doc('settings').get();
            const price = settingsDoc.data()?.pwffFullPassPrice || 50;
            amountInCents = Math.round(price * 100);
            note = 'PWFF Full Festival Pass';
        } else {
            // Look up the block's actual admin-configured price — this used to be
            // hardcoded to a flat $10 for every block regardless of what was set
            // in the Festival Hub, which either overcharged or undercharged
            // customers depending on the block's real price. Same lookup pattern
            // as the 'movie'/'watchPartyTicket' branch above.
            //
            // Capacity is optional — most blocks have none set, meaning
            // unlimited (the original, unchanged behavior). Only enforced when
            // an admin has explicitly set a cap on this specific block. This
            // check-and-reserve happens atomically, before the card is ever
            // charged, so a sold-out block never takes anyone's money AND two
            // simultaneous buyers can never both claim the last seat.
            const reservation = await reserveBlockCapacity(db, itemId);
            if (!reservation) throw new Error("Item record not found.");
            const blockData = reservation.blockData;
            purchasedBlockData = blockData;
            purchasePartnerId = blockData?.partnerId || null;
            releaseCapacityReservation = reservation.release;
            // A screening whose rewatch week is over can't be bought any more.
            if (blockSaleClosed({ screeningStartTime: blockData?.screeningStartTime || blockData?.watchPartyStartTime, festivalEndTime: blockData?.festivalEndTime }, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS)) {
                throw new Error('This screening has ended and its tickets are no longer on sale.');
            }

            amountInCents = Math.round((blockData?.price ?? 10.00) * 100);
            note = `Unlock Block: ${blockData?.title || blockTitle || itemId}`;
        }
    }
    else if (Object.prototype.hasOwnProperty.call(staticPriceMap, paymentType)) {
        amountInCents = staticPriceMap[paymentType];
        note = `Platform ${paymentType.replace(/([A-Z])/g, ' $1')}`;
    }
    else {
        throw new Error("Invalid access vector specified.");
    }

    // --- APPLY VOUCHER DISCOUNT (If any) ---
    if (promo) amountInCents = priceAfterPromo(amountInCents, promo);

    // --- PROMO VOUCHER SOURCE INTEGRITY CHECK ---
    // sourceId 'PROMO_VOUCHER' means "skip Square, this is free" (see
    // SquarePaymentModal.tsx). That was trusted unconditionally: a request
    // could send sourceId: 'PROMO_VOUCHER' with no promoCode at all (or an
    // invalid one) and walk straight past the charge below with
    // amountInCents still >0, getting the item for free. Now it's only
    // ever allowed once a real promo code has already brought the price to
    // exactly $0 above — otherwise this is rejected outright rather than
    // silently skipping the charge.
    if (sourceId === 'PROMO_VOUCHER' && amountInCents > 0) {
        if (releaseCapacityReservation) await releaseCapacityReservation();
        releaseCapacityReservation = null;
        return new Response(JSON.stringify({ error: "A valid promo code reducing the price to $0 is required to use this payment method." }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- RESERVE ONE USE OF THE PROMO CODE (atomic, before charging) ---
    // Checking "used < max" and counting the use much later let many
    // simultaneous checkouts all use a single-use 100%-off code. The use is
    // now claimed in one transaction first, and given back if the charge fails.
    if (promo && promoCode && db) {
        const promoRef = db.collection('promo_codes').doc(promoCode);
        const claimed = await db.runTransaction(async tx => {
            const fresh = (await tx.get(promoRef)).data();
            if (promoProblem(fresh, itemId)) return false;
            tx.update(promoRef, { usedCount: FieldValue.increment(1) });
            return true;
        });
        if (!claimed) {
            if (releaseCapacityReservation) await releaseCapacityReservation();
            releaseCapacityReservation = null;
            return new Response(JSON.stringify({ error: 'This promo code has just been used up.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        const releaseCapacity = releaseCapacityReservation;
        releaseCapacityReservation = async () => {
            try { await promoRef.update({ usedCount: FieldValue.increment(-1) }); } catch (e) { console.error('[Payment API] Failed to give back promo use:', e); }
            if (releaseCapacity) await releaseCapacity();
        };
    }

    // --- PROCESS TRANSACTION ---
    // Kept so the ticket record can point at the exact Square payment
    // (Admin → Payments & refunds uses it to match refunds to customers).
    let squarePaymentId: string | null = null;
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
            // Marks partner-festival sales so the PWFF money reports can
            // leave other festivals' money out (Square allows 40 chars).
            ...(isOutsidePartner(purchasePartnerId) ? { reference_id: `partner:${purchasePartnerId}`.slice(0, 40) } : {}),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.errors?.[0]?.detail || 'Payment failed.';
            throw new Error(errorMessage);
        }
        squarePaymentId = data.payment?.id || null;
    }

    // Charged (or free): from here on nothing may undo the promo/seat claim.
    releaseCapacityReservation = null;

    // Premiere payment: keep a record, thank the filmmaker, tell the studio.
    if (isPremierePayment(paymentType)) {
        const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        if (db) {
            await db.collection('premiere_payments').add({
                kind: paymentType, film: premiereFilm, amountPaid: amountInCents / 100, email: email || null,
                uid: uid || null, squarePaymentId, paidAt: FieldValue.serverTimestamp(),
            }).catch(e => console.error('[Payment API] Failed to record premiere payment:', e));
        }
        if (process.env.RESEND_API_KEY) {
            const label = PREMIERE_LABELS[paymentType];
            const sends: Promise<any>[] = [];
            if (email) sends.push(resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: `Payment received: ${label} for ${premiereFilm}`.replace(/[\r\n]/g, ' ').slice(0, 150),
                html: renderBrandedEmail({
                    title: 'Payment received',
                    bodyHtml: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">Thank you!</h1>
<p style="margin:0 0 12px;">We received your <strong>${escapeHtml(label.toLowerCase())}</strong> of <strong>${amountFormatted}</strong> for <strong>${escapeHtml(premiereFilm)}</strong>.</p>
<p style="margin:0 0 12px;">${paymentType === 'premiereBooking' ? 'Your date is held. We\'ll be in touch to set up your premiere page, countdown and tickets.' : 'Your free premiere is fully paid. See you on premiere night!'}</p>
<p style="margin:0;font-size:13px;color:#666;">Questions? Just reply to this email.</p>`,
                }),
            }));
            sends.push(resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: 'studio@cratetv.net',
                ...(email ? { reply_to: email } : {}),
                subject: `💰 ${label} paid: ${premiereFilm}`.replace(/[\r\n]/g, ' ').slice(0, 150),
                html: renderBrandedEmail({
                    title: `${label} paid`,
                    bodyHtml: `<p style="margin:0 0 8px;"><strong>${escapeHtml(premiereFilm)}</strong></p><p style="margin:0 0 8px;">${amountFormatted} · ${escapeHtml(email || 'no email')}</p><p style="margin:0;font-size:12px;color:#888;">Also listed in Admin → Payments & refunds.</p>`,
                }),
            }));
            await Promise.allSettled(sends);
        }
    }

    // Receipt / confirmation email
    if (email && process.env.RESEND_API_KEY && !isPremierePayment(paymentType)) {
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
                            // FIX (user report — reminder email showed "UTC"
                            // instead of a Philadelphia-relevant time): same
                            // missing-timeZone issue as the reminder emails.
                            watchPartyTime = startDate.toLocaleString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long',
                                day: 'numeric', hour: '2-digit', minute: '2-digit',
                                timeZone: 'America/New_York', timeZoneName: 'short'
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
                        <h2 style="font-size: 24px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase;">${escapeHtml(movieTitle)}</h2>
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
                        <p style="font-size: 12px; color: #555; margin: 0;">Amount paid: ${amountFormatted} ${promoCode ? `· Voucher applied: ${escapeHtml(promoCode)}` : ''}</p>
                        <p style="font-size: 11px; color: #444; margin: 8px 0 0;">Your ticket is linked to your Crate TV account and will be available on all your devices.</p>
                    </div>
                </div>
            ` : `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden; padding: 32px;">
                    <img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="100" style="display: block; border: 0; margin-bottom: 20px;" />
                    <h1 style="font-size: 22px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase;">Access Confirmed</h1>
                    <p style="color: #888; margin: 0 0 16px;"><strong style="color: white;">Resource:</strong> ${escapeHtml(note)}</p>
                    <p style="color: #888; margin: 0 0 24px;"><strong style="color: white;">Amount:</strong> ${amountFormatted}</p>
                    ${promoCode ? `<p style="font-size: 11px; color: #555;">Voucher applied: ${escapeHtml(promoCode)}</p>` : ''}
                    <p style="font-size: 11px; color: #555; margin: 0;">This resource is now unlocked on your Crate TV account.</p>
                </div>
            `;

            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: isWatchParty
                    ? `Your ticket for ${movieTitle} — Crate TV Watch Party`
                    : `Access confirmed: ${note.replace(/[\r\n]/g, ' ')}`,
                html: emailHtml,
            });
        } catch (emailError) {
            console.error("[Payment API] Failed to send confirmation:", emailError);
        }
    }

    // --- LOG TICKET SALE FOR FESTIVAL REPORTING ---
    if (db && (paymentType === 'watchPartyTicket' || paymentType === 'block' || paymentType === 'movie')) {
        const ticketRecord = {
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
            partnerId: purchasePartnerId,
            squarePaymentId,
        };
        try {
            await db.collection('festival_tickets').add(ticketRecord);
        } catch (firstError) {
            // One retry — most failures at this point are transient
            // (a brief Firestore hiccup), and the customer has already
            // been successfully charged, so it's worth a second attempt
            // before treating this as a real loss.
            try {
                await db.collection('festival_tickets').add(ticketRecord);
                console.warn('[Payment API] Ticket sale logged on retry after initial failure.');
            } catch (secondError) {
                console.error('[Payment API] Failed to log ticket sale after retry:', secondError);
                // Everything needed to rebuild the record: the health check
                // (api/health-check-cron.ts) restores the sale from this.
                logServerError('api/process-square-payment:ticket-logging', secondError, {
                    itemId, paymentType, amountPaid: ticketRecord.amountPaid, email: email || null,
                    note, promoCode: promoCode || null, uid: uid || null, partnerId: purchasePartnerId,
                });
            }
        }
    }

    // --- NOTIFY SITE OWNER OF THE SALE ---
    // FEATURE (user request — a notification every time someone buys a
    // ticket): fires right here, at the same moment the sale is confirmed
    // and logged, rather than depending on Square's webhook (which is
    // reliable but asynchronous, and square-webhook.ts is deliberately
    // scoped to refunds/disputes, not purchase confirmations — mixing
    // both concerns there would make it a lot noisier for what that file
    // needs to stay focused on). Fire-and-forget: a missed notification
    // email is a minor inconvenience, not worth adding retry complexity
    // or delay to the actual purchase flow for.
    if (db) {
        (async () => {
            try {
                const settingsDoc = await db.collection('content').doc('settings').get();
                const technicalEmail = settingsDoc.data()?.technicalEmail || 'cratetiv@gmail.com';
                await resend.emails.send({
                    from: `Crate TV Sales <${fromEmail}>`,
                    to: [technicalEmail],
                    subject: `🎟️ Ticket sold: ${note} — $${(amountInCents / 100).toFixed(2)}`,
                    html: renderBrandedEmail({
                        title: 'New Ticket Sale',
                        bodyHtml: `
                            <p style="margin:0 0 16px;font-size:14px;">Someone just bought a ticket.</p>
                            <div style="padding:16px;background:rgba(255,255,255,0.03);border-left:3px solid #22c55e;">
                                <p style="margin:0 0 4px;"><strong>Item:</strong> ${escapeHtml(note)}</p>
                                <p style="margin:0 0 4px;"><strong>Amount:</strong> $${(amountInCents / 100).toFixed(2)}</p>
                                <p style="margin:0 0 4px;"><strong>Buyer email:</strong> ${escapeHtml(email || '(not provided)')}</p>
                                ${promoCode ? `<p style="margin:0;"><strong>Promo code used:</strong> ${escapeHtml(promoCode)}</p>` : ''}
                            </div>
                        `,
                    }),
                });
            } catch (notifyError) {
                console.error('[Payment API] Failed to send sale notification:', notifyError);
                // Deliberately not calling logServerError — a missed
                // notification email isn't worth an alert of its own.
            }
        })();
    }


    // This is done server-side (Admin SDK) because Firestore security rules
    // block clients from writing payment/access fields directly.
    if (db && uid && paymentType === 'block' && itemId && purchasePartnerId && partnerPassBlocks) {
        try {
            await grantBlocksToUser(db, uid, purchasePartnerId, partnerPassBlocks);
            console.log(`[Payment API] Granted partner festival pass ${purchasePartnerId} to ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant partner festival pass:', e);
            logServerError('api/process-square-payment:partner-pass-grant', e, { uid, itemId });
        }
    } else if (db && uid && paymentType === 'block' && itemId && itemId !== FULL_PASS_ITEM) {
        try {
            // FIX (Oct 2026 audit): this was "14 days from purchase", so anyone
            // who bought more than two weeks before the festival was locked
            // out on screening day. Now valid through the screening plus the
            // post-festival rewatch window (never less than 14 days).
            const expirationDate = blockAccessExpiry({
                nowMs: Date.now(),
                screeningStartTime: purchasedBlockData?.screeningStartTime || purchasedBlockData?.watchPartyStartTime,
                rewatchWindowMs: FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS,
            });
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
    if (db && uid && paymentType === 'block' && itemId === FULL_PASS_ITEM) {
        try {
            // Good for THIS festival only: ends a week (+1 day) after the last block.
            const passExpiry = festivalPassExpiryFor(await getPwffBlocks(db), FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);
            if (!passExpiry) throw new Error('No festival schedule to attach the pass to.');
            const current = (await db.collection('users').doc(uid).get()).data()?.festivalPassExpiry;
            await db.collection('users').doc(uid).set({
                hasFestivalAllAccess: true,
                festivalAllAccessGrantedAt: new Date().toISOString(),
                festivalPassExpiry: laterExpiry(current, passExpiry),
            }, { merge: true });
            console.log(`[Payment API] Granted festival all-access to user ${uid}`);
        } catch (e) {
            console.error('[Payment API] Failed to grant all-access:', e);
        }
    }

    // CrateFest pass — charged correctly (see staticPriceMap above) but once
    // never granted anything server-side. The only place that ever set
    // hasCrateFestPass was a direct client-side Firestore write
    // (AuthContext's grantCrateFestPass), which is exactly the kind of write firestore.rules now
    // blocks — meaning anyone paying for it got charged and
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
            const rentalExpiry = await computeRentalExpiry(db, itemId);
            await db.collection('users').doc(uid).set({
                rentals: { [itemId]: rentalExpiry.toISOString() }
            }, { merge: true });
            console.log(`[Payment API] Unlocked rental ${itemId} for user ${uid}, expires ${rentalExpiry.toISOString()}`);
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