// Admin → Watch Party Control Room → live numbers and controls.
//   POST { blockId, password }                         viewership stats for that party
//   POST { blockId, password, action:'sales' }         tickets sold + money made (top admin only)
//   POST { blockId, password, action:'dropped' }       viewers who stopped watching in the last 15 min
//   POST { blockId, password, action:'pin', text, type } pin an announcement to the top of everyone's chat
//   POST { blockId, password, action:'unpin' }         remove it
// The admin panel has no regular CRATE sign-in, so the browser can't read
// these from the database itself; the server does, after the admin check.
// The pure logic lives in api/_lib/controlRoom.ts (tested).
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword, isMasterAdmin } from './_lib/adminAuth.js';
import { computeWatchPartyStats } from './_lib/watchPartyStats.js';
import { cleanLine } from './_lib/validation.js';
import { summarizeSales, splitSales, findDroppedViewers, PIN_MAX_LENGTH } from './_lib/controlRoom.js';
import { loadAllPayments, ticketFees } from './_lib/partnerFees.js';
import { filmmakerShareOf } from './_lib/revenueSplit.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const ms = (v: any): number | null => (v && typeof v.toMillis === 'function' ? v.toMillis() : null);

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { blockId, password } = body;
        const action = typeof body.action === 'string' ? body.action : 'stats';
        if (!(await verifyAdminPassword(password))) return json({ error: 'Unauthorized' }, 401);
        if (!blockId || typeof blockId !== 'string' || blockId.length > 200 || blockId.includes('/')) return json({ error: 'Missing blockId' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');
        const now = Date.now();

        if (action === 'stats') return json(await computeWatchPartyStats(db, blockId));

        if (action === 'sales') {
            // Money is for the top admin password only, not staff keys.
            if (!(await isMasterAdmin(password))) return json({ error: 'Only the main admin can see sales.' }, 403);
            const snap = await db.collection('festival_tickets').where('itemId', '==', blockId).limit(2000).get();
            const records = snap.docs.map(d => {
                const x = d.data();
                return { amountPaid: x.amountPaid, paymentType: x.paymentType, email: x.email, promoCode: x.promoCode, purchasedAtMs: ms(x.purchasedAt) };
            });
            const summary = summarizeSales(records, now);
            // Square's fees and the split. If Square can't be reached the money lines are left out, never guessed.
            try {
                const payments = await loadAllPayments();
                if (payments) {
                    const feeRows = ticketFees(snap.docs.map(d => { const x = d.data(); return { id: d.id, squarePaymentId: x.squarePaymentId || null, purchasedAt: null }; }), payments);
                    const byId = new Map(feeRows.map(f => [f.id, f.fee]));
                    const deal = (await db.collection('film_deals').doc(blockId).get()).data();
                    summary.split = splitSales(summary.revenue, snap.docs.map(d => ({ amount: Number(d.data().amountPaid) || 0, fee: byId.get(d.id) ?? null })), filmmakerShareOf(deal as any));
                }
            } catch (e) { console.error('[watch-party-stats] split failed:', e); }
            return json(summary);
        }

        if (action === 'dropped') {
            const snap = await db.collection('watchSessions').where('blockId', '==', blockId).get();
            const dropped = findDroppedViewers(snap.docs.map(d => {
                const x = d.data();
                return {
                    userId: String(x.userId || ''), startedAtMs: ms(x.startedAt), lastHeartbeatMs: ms(x.lastHeartbeat),
                    endedAtMs: ms(x.endedAt), watchSeconds: Number(x.watchSeconds) || 0, device: String(x.device || ''),
                };
            }), now);
            // Names only (never emails) — staff keys can see this list too.
            const userDocs = dropped.length
                ? await db.getAll(...dropped.map(d => db.collection('users').doc(d.userId))).catch(() => [])
                : [];
            const names = new Map(userDocs.map(u => [u.id, (u.data()?.name as string) || '']));
            return json({
                dropped: dropped.map(d => ({
                    name: names.get(d.userId) || 'Viewer', device: d.device, watchedMinutes: d.watchedMinutes,
                    stoppedMsAgo: d.stoppedMsAgo, how: d.how,
                })),
            });
        }

        if (action === 'pin' || action === 'unpin') {
            const ref = db.collection('watch_parties').doc(blockId);
            if (action === 'unpin') {
                await ref.set({ pinnedMessage: FieldValue.delete() }, { merge: true });
                return json({ success: true });
            }
            const text = cleanLine(body.text, PIN_MAX_LENGTH);
            if (!text) return json({ error: 'Type a message to pin.' }, 400);
            const existing = await ref.get();
            const base = existing.exists ? {} : {
                // A party that has never run has no record yet; create it in
                // its normal "waiting" shape so nothing reads a half-made one.
                status: 'waiting', isPlaying: false, currentTime: 0,
                type: body.type === 'block' ? 'block' : 'movie',
                lastUpdated: FieldValue.serverTimestamp(),
            };
            await ref.set({ ...base, pinnedMessage: { text, at: now } }, { merge: true });
            await db.collection('audit_logs').add({
                action: 'WATCH_PARTY_PINNED', type: 'CONTENT', operatorName: 'ADMIN',
                timestamp: FieldValue.serverTimestamp(), details: `${blockId}: ${text}`,
            }).catch(() => {});
            return json({ success: true, pinnedMessage: { text, at: now } });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-watch-party-stats] error:', e);
        return json({ error: 'Could not load that. Try again in a minute.' }, 500);
    }
}
