// Admin → Earnings & Payouts.
//
// One endpoint, master admin only. Actions (POST body `action`):
//   summary        everything the Earnings page shows: totals, a month-by-month
//                  breakdown, every film's split, every payee's balance,
//                  open payout requests and payout history.
//   set-deal       a film's own split and payees        { movieKey, filmmakerPercent, payees[], notes }
//   clear-deal     back to the default 70/30            { movieKey }
//   set-payee      how someone wants to be paid         { name, method, handle, email, notes, w9OnFile }
//   record-payout  log money you've sent                { name, amountCents, method, reference, requestId?, notify? }
//
// Money is never moved by this endpoint. You send it (PayPal, Cash App,
// Venmo, Zelle, check) and then record it here, which lowers the balance on
// the filmmaker's dashboard exactly like a completed payout request.
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import {
    fetchAllRelevantPayments, getSquareCredentials, computeRevenueByFilm, fetchFilmDeals,
    SYSTEM_RESET_DATE, SquarePayment,
} from './_lib/filmmakerBalance.js';
import { computeShopRevenueByFilmmaker } from './_lib/shopRevenue.js';
import { normalize } from './_lib/creditMatch.js';
import { splitRevenue, cleanDeal, filmmakerShareOf, PAYOUT_METHOD_LABELS, PayoutMethod } from './_lib/revenueSplit.js';
import { cleanLine, cleanText, isValidEmail, escapeHtml } from './_lib/validation.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { Movie } from '../types.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const METHODS = Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[];
const MINIMUM_PAYOUT_CENTS = 500;

const monthOf = (iso?: string) => {
    if (!iso) return 'unknown';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'unknown';
    // Philadelphia calendar month.
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(d);
    return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
};

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return null;
};

const feeOf = (p: SquarePayment) => (p.processing_fee || []).reduce((s, f) => s + (f.amount_money?.amount || 0), 0);

/** Non-film money: what kind it is and who it belongs to. */
function classifyOther(p: SquarePayment): 'festival' | 'partner' | 'crate' {
    if (p.reference_id?.startsWith('partner:')) return 'partner';
    const note = p.note || '';
    if (/PWFF Full Festival Pass|Platform pass|^(?:Unlock Block|Festival Block Ticket):/.test(note)) return 'festival';
    return 'crate';
}

async function buildSummary(db: FirebaseFirestore.Firestore) {
    const { accessToken, locationId } = getSquareCredentials();
    const [payments, moviesSnap, deals, payeeSnap, completedSnap, pendingSnap, shopByName] = await Promise.all([
        accessToken ? fetchAllRelevantPayments(accessToken, locationId) : Promise.resolve([] as SquarePayment[]),
        db.collection('movies').get(),
        fetchFilmDeals(db),
        db.collection('payee_profiles').get(),
        db.collection('payout_requests').where('status', '==', 'completed').get(),
        db.collection('payout_requests').where('status', '==', 'pending').get(),
        computeShopRevenueByFilmmaker(db, SYSTEM_RESET_DATE).catch(() => new Map<string, { directorName: string; cents: number }>()),
    ]);

    const movies: Movie[] = moviesSnap.docs.map(d => ({ key: d.id, ...d.data() } as Movie));
    const movieByTitle = new Map(movies.map(m => [(m.title || '').trim(), m]));

    // ── Month buckets ──
    type Month = { month: string; gross: number; filmmakers: number; crate: number; festival: number; partner: number; fees: number };
    const months = new Map<string, Month>();
    const monthRow = (m: string) => {
        if (!months.has(m)) months.set(m, { month: m, gross: 0, filmmakers: 0, crate: 0, festival: 0, partner: 0, fees: 0 });
        return months.get(m)!;
    };

    // Film revenue, payment by payment, using the exact rules behind every filmmaker's balance.
    const counted = new Set<SquarePayment>();
    const filmLines: { title: string; field: string; amount: number; gross: number; at?: string }[] = [];
    const revenueByFilm = await computeRevenueByFilm(db, payments, movies, (title, field, amount, payment) => {
        counted.add(payment);
        filmLines.push({ title, field, amount, gross: payment.amount_money.amount, at: payment.created_at });   // amount: after shared card fees; gross: what the buyer paid
    });

    let filmGross = 0, filmmakerTotal = 0, crateFromFilms = 0;
    for (const line of filmLines) {
        const movie = movieByTitle.get(line.title.trim());
        const split = splitRevenue(line.amount, movie || { director: '' }, movie ? deals[movie.key] : undefined);
        const row = monthRow(monthOf(line.at));
        row.gross += line.gross;
        row.filmmakers += split.filmmakerAmount;
        row.crate += split.crateAmount;
        filmGross += line.gross;
        filmmakerTotal += split.filmmakerAmount;
        crateFromFilms += split.crateAmount;
    }

    let gross = 0, fees = 0, festival = 0, partner = 0, crateOnly = 0, heldDuringFestival = 0;
    for (const p of payments) {
        const amt = p.amount_money.amount;
        const row = monthRow(monthOf(p.created_at));
        gross += amt;
        const fee = feeOf(p);
        fees += fee;
        row.fees += fee;
        if (counted.has(p)) continue;
        const kind = classifyOther(p);
        row.gross += amt;
        if (kind === 'festival') { festival += amt; row.festival += amt; }
        else if (kind === 'partner') { partner += amt; row.partner += amt; }
        else {
            // A festival film's rental bought while the festival was still running stays with CRATE.
            if (/VOD Rental:/.test(p.note || '')) heldDuringFestival += amt;
            else crateOnly += amt;
            row.crate += amt;
        }
    }

    // ── Films ──
    const films = movies
        .map(m => {
            const rev = revenueByFilm[m.title] || revenueByFilm[(m.title || '').trim()] || { donations: 0, tickets: 0, vodRentals: 0 };
            const total = rev.donations + rev.tickets + rev.vodRentals;
            const deal = deals[m.key];
            const split = splitRevenue(total, m, deal);
            const buyersPaid = filmLines.filter(l => l.title.trim() === (m.title || '').trim()).reduce((s, l) => s + l.gross, 0);
            return {
                buyersPaid,
                cardFees: Math.max(0, buyersPaid - total),   // Square's shared fees (sales from Oct 31, 2026)
                key: m.key,
                title: m.title,
                poster: (m as any).poster || '',
                director: m.director || '',
                producers: m.producers || '',
                revenue: { donations: rev.donations, tickets: rev.tickets, rentals: rev.vodRentals, total },
                filmmakerPercent: Math.round(filmmakerShareOf(deal) * 10000) / 100,
                customDeal: !!deal,
                deal: deal || null,
                filmmakerAmount: split.filmmakerAmount,
                crateAmount: split.crateAmount,
                payees: split.payees.map(p => ({ name: p.name, percentOfFilmmakerSide: Math.round(p.fraction * 1000) / 10, amount: p.amount })),
            };
        })
        .sort((a, b) => b.revenue.total - a.revenue.total || a.title.localeCompare(b.title));

    // ── Payees ──
    const prefs = new Map<string, any>();
    payeeSnap.forEach(d => prefs.set(d.id, d.data()));

    type Payee = { key: string; name: string; filmEarnings: number; shopEarnings: number; earned: number; paidOut: number; balance: number; films: string[]; lastPaidAt: string | null; pref: any; pendingRequestId: string | null };
    const payees = new Map<string, Payee>();
    const payeeRow = (name: string) => {
        const key = normalize(name);
        if (!payees.has(key)) payees.set(key, { key, name: name.trim(), filmEarnings: 0, shopEarnings: 0, earned: 0, paidOut: 0, balance: 0, films: [], lastPaidAt: null, pref: null, pendingRequestId: null });
        return payees.get(key)!;
    };
    for (const f of films) {
        for (const p of f.payees) {
            const row = payeeRow(p.name);
            row.filmEarnings += p.amount;
            if (!row.films.includes(f.title)) row.films.push(f.title);
        }
    }
    for (const [, entry] of shopByName) {
        if (!entry?.directorName || !(entry.cents > 0)) continue;
        payeeRow(entry.directorName).shopEarnings += entry.cents;
    }

    const history = completedSnap.docs.map(d => {
        const x = d.data();
        return {
            id: d.id,
            name: x.directorName || x.payeeName || '',
            amount: Number(x.amount) || 0,
            method: x.methodUsed || x.payoutMethod || '',
            reference: x.reference || '',
            completedAt: toIso(x.completionDate) || toIso(x.requestDate),
            recordedBy: x.recordedBy || '',
        };
    }).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    for (const h of history) {
        if (!h.name) continue;
        const row = payeeRow(h.name);
        row.paidOut += h.amount;
        if (!row.lastPaidAt || (h.completedAt || '') > row.lastPaidAt) row.lastPaidAt = h.completedAt;
    }

    const pendingRequests = pendingSnap.docs.map(d => {
        const x = d.data();
        return { id: d.id, name: x.directorName || '', email: x.email || '', amount: Number(x.amount) || 0, requestedAt: toIso(x.requestDate), filmTitles: x.filmTitles || [], payoutMethod: x.payoutMethod || '', payoutDetails: x.payoutDetails || '' };
    });
    for (const r of pendingRequests) if (r.name) payeeRow(r.name).pendingRequestId = r.id;

    let owedNow = 0, paidOutAllTime = 0;
    for (const row of payees.values()) {
        row.earned = row.filmEarnings + row.shopEarnings;
        row.balance = Math.max(0, row.earned - row.paidOut);
        row.pref = prefs.get(row.key) || null;
        owedNow += row.balance;
        paidOutAllTime += row.paidOut;
    }
    const shopFilmmaker = [...payees.values()].reduce((s, p) => s + p.shopEarnings, 0);

    return {
        generatedAt: new Date().toISOString(),
        squareConnected: !!accessToken,
        minimumPayoutCents: MINIMUM_PAYOUT_CENTS,
        totals: {
            gross, fees, filmGross, filmmakerShare: filmmakerTotal, crateFromFilms,
            festival, partner, heldDuringFestival, crateOnly, shopFilmmaker,
            crateKeeps: crateFromFilms + crateOnly + heldDuringFestival,
            owedNow, paidOutAllTime,
        },
        months: [...months.values()].filter(m => m.month !== 'unknown').sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
        films,
        payees: [...payees.values()].sort((a, b) => b.balance - a.balance || b.earned - a.earned),
        pendingRequests,
        history: history.slice(0, 100),
    };
}

async function audit(db: FirebaseFirestore.Firestore, action: string, details: string) {
    try {
        await db.collection('audit_logs').add({ action, type: 'FINANCE', details, operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp() });
    } catch { /* never block a save on the log */ }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        const action = String(body.action || 'summary');

        if (action === 'summary') return json(await buildSummary(db));

        if (action === 'set-deal' || action === 'clear-deal') {
            const movieKey = cleanLine(body.movieKey, 200);
            if (!movieKey || !(await db.collection('movies').doc(movieKey).get()).exists) return json({ error: 'Film not found.' }, 404);
            if (action === 'clear-deal') {
                await db.collection('film_deals').doc(movieKey).delete();
                await audit(db, 'FILM_DEAL_CLEARED', `${movieKey} back to the default split`);
                return json({ success: true });
            }
            const { deal, error } = cleanDeal(body);
            if (error || !deal) return json({ error }, 400);
            await db.collection('film_deals').doc(movieKey).set({ ...deal, updatedAt: FieldValue.serverTimestamp() });
            await audit(db, 'FILM_DEAL_SET', `${movieKey}: filmmaker ${Math.round((deal.filmmakerShare || 0) * 1000) / 10}%${deal.payees?.length ? ` · payees ${deal.payees.map(p => `${p.name} ${p.share}`).join(', ')}` : ''}`);
            return json({ success: true });
        }

        if (action === 'set-payee') {
            const name = cleanLine(body.name, 120);
            const key = normalize(name);
            if (!key) return json({ error: 'A name is required.' }, 400);
            const method = METHODS.includes(body.method) ? body.method : 'other';
            const email = cleanLine(body.email, 200);
            if (email && !isValidEmail(email)) return json({ error: 'That email address looks wrong.' }, 400);
            await db.collection('payee_profiles').doc(key).set({
                displayName: name,
                method,
                handle: cleanLine(body.handle, 200),
                email,
                notes: cleanText(body.notes, 1000),
                w9OnFile: body.w9OnFile === true,
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: 'admin',
            }, { merge: true });
            return json({ success: true });
        }

        if (action === 'record-payout') {
            const name = cleanLine(body.name, 120);
            const amount = Math.round(Number(body.amountCents));
            if (!normalize(name)) return json({ error: 'Who was paid?' }, 400);
            if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_00) return json({ error: 'Enter an amount between $0.01 and $10,000.' }, 400);
            const method = METHODS.includes(body.method) ? body.method : 'other';
            const reference = cleanLine(body.reference, 200);

            const requestId = cleanLine(body.requestId, 200);
            if (requestId) {
                const ref = db.collection('payout_requests').doc(requestId);
                const doc = await ref.get();
                if (!doc.exists) return json({ error: 'That payout request no longer exists.' }, 404);
                if (doc.data()?.status !== 'pending') return json({ error: `That request is already ${doc.data()?.status}.` }, 409);
                await ref.update({
                    status: 'completed', amount, methodUsed: method, reference,
                    completionDate: FieldValue.serverTimestamp(), recordedBy: 'admin',
                });
            } else {
                await db.collection('payout_requests').add({
                    directorName: name, amount, status: 'completed', methodUsed: method, reference,
                    requestDate: FieldValue.serverTimestamp(), completionDate: FieldValue.serverTimestamp(),
                    recordedBy: 'admin', source: 'admin-earnings',
                });
            }
            await audit(db, 'PAYOUT_RECORDED', `$${(amount / 100).toFixed(2)} to ${name} via ${PAYOUT_METHOD_LABELS[method as PayoutMethod]}${reference ? ` (${reference})` : ''}`);

            // Optional receipt email to the filmmaker.
            const to = cleanLine(body.notifyEmail, 200);
            if (body.notify === true && to && isValidEmail(to) && process.env.RESEND_API_KEY) {
                try {
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    const dollars = `$${(amount / 100).toFixed(2)}`;
                    await resend.emails.send({
                        from: `CRATE TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`,
                        to,
                        subject: `You've been paid ${dollars} by CRATE TV`,
                        html: renderBrandedEmail({
                            title: 'Payout sent',
                            bodyHtml: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">${dollars} is on its way</h1>
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)}, we've sent your CRATE TV earnings via <strong>${escapeHtml(PAYOUT_METHOD_LABELS[method as PayoutMethod])}</strong>.</p>
${reference ? `<p style="margin:0 0 12px;">Reference: ${escapeHtml(reference)}</p>` : ''}
<p style="margin:0;">You can see your full earnings any time in your filmmaker dashboard. Thank you for sharing your work with CRATE.</p>`,
                        }),
                    });
                } catch (e) { console.error('[admin-earnings] receipt email failed', e); }
            }
            return json({ success: true });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        console.error('[admin-earnings]', error);
        return json({ error: (error as Error).message }, 500);
    }
}
