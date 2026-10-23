// Admin → Payments & refunds. Master admin only.
//
//   POST { action:'list', days? }   recent Square payments, matched to the
//                                   customer where CRATE knows them, with
//                                   likely double charges flagged
//   POST { action:'refund', paymentId, amountCents, reason, nonce,
//          markTicketRefunded?, notify? }
//                                   refunds through Square
//
// Safety: only the two top-level admin passwords; the amount is re-checked
// against Square's own record of what's left to refund; a refund request is
// sent with an idempotency key built from the dialog's one-time nonce, so a
// double-click can never refund twice; every refund is logged.
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getSquareCredentials, SYSTEM_RESET_DATE } from './_lib/filmmakerBalance.js';
import { findLikelyDuplicates, refundProblem, refundableCents } from './_lib/duplicateCharges.js';
import { cleanLine, isValidEmail, escapeHtml } from './_lib/validation.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const squareBase = () => (process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com');
const squareHeaders = (token: string) => ({ 'Square-Version': '2024-05-15', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
    return null;
};

interface SquarePaymentRaw {
    id: string; created_at: string; status: string; note?: string; reference_id?: string; receipt_url?: string;
    amount_money?: { amount: number }; refunded_money?: { amount: number };
    card_details?: { card?: { last_4?: string; card_brand?: string } };
}

async function listSquarePayments(token: string, locationId: string | undefined, sinceIso: string): Promise<SquarePaymentRaw[]> {
    const all: SquarePaymentRaw[] = [];
    let cursor: string | undefined;
    do {
        const url = new URL(`${squareBase()}/v2/payments`);
        url.searchParams.set('begin_time', sinceIso);
        url.searchParams.set('sort_order', 'DESC');
        if (locationId) url.searchParams.set('location_id', locationId);
        if (cursor) url.searchParams.set('cursor', cursor);
        const res = await fetch(url.toString(), { headers: squareHeaders(token) });
        if (!res.ok) throw new Error('Could not reach Square.');
        const data = await res.json();
        all.push(...(data.payments || []));
        cursor = data.cursor;
    } while (cursor && all.length < 5000);
    return all;
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');
        const { accessToken, locationId } = getSquareCredentials();
        const action = String(body.action || 'list');

        if (action === 'list') {
            if (!accessToken) return json({ squareConnected: false, payments: [], refunds: [] });
            const days = Math.min(400, Math.max(1, Number(body.days) || 60));
            const since = new Date(Math.max(Date.now() - days * 86400_000, Date.parse(SYSTEM_RESET_DATE))).toISOString();
            const [payments, ticketsSnap, refundsSnap] = await Promise.all([
                listSquarePayments(accessToken, locationId, since),
                db.collection('festival_tickets').where('purchasedAt', '>=', new Date(since)).get().catch(() => null),
                db.collection('refunds').orderBy('createdAt', 'desc').limit(200).get().catch(() => null),
            ]);

            // Match each Square payment to CRATE's ticket record: exact id when the
            // ticket has one (new purchases), otherwise same note + amount within 3 minutes.
            const tickets = (ticketsSnap?.docs || []).map(d => ({ id: d.id, ...(d.data() as any), at: toIso(d.data().purchasedAt) }));
            const byPaymentId = new Map(tickets.filter(t => t.squarePaymentId).map(t => [t.squarePaymentId, t]));
            const used = new Set<string>();
            const matchTicket = (p: SquarePaymentRaw) => {
                const exact = byPaymentId.get(p.id);
                if (exact) { used.add(exact.id); return exact; }
                const amt = p.amount_money?.amount || 0, t0 = Date.parse(p.created_at);
                const hit = tickets.find(t => !used.has(t.id) && !t.squarePaymentId && (t.note || '') === (p.note || '')
                    && Math.round((Number(t.amountPaid) || 0) * 100) === amt && t.at && Math.abs(Date.parse(t.at) - t0) < 3 * 60_000);
                if (hit) used.add(hit.id);
                return hit;
            };

            const rows = payments
                .filter(p => p.status === 'COMPLETED' || (p.refunded_money?.amount || 0) > 0)
                .map(p => {
                    const t = matchTicket(p);
                    return {
                        id: p.id, createdAt: p.created_at, status: p.status,
                        amount: p.amount_money?.amount || 0, refunded: p.refunded_money?.amount || 0,
                        note: p.note || '', partner: p.reference_id?.startsWith('partner:') ? p.reference_id.slice(8) : null,
                        cardBrand: p.card_details?.card?.card_brand || '', cardLast4: p.card_details?.card?.last_4 || '',
                        receiptUrl: p.receipt_url || '',
                        email: t?.email || null, ticketId: t?.id || null, ticketRefunded: !!(t?.refunded),
                    };
                });
            const dupes = findLikelyDuplicates(rows);
            const withFlags = rows.map(r => ({ ...r, refundable: refundableCents(r), duplicateOf: dupes.get(r.id) || null }));
            const refunds = (refundsSnap?.docs || []).map(d => {
                const x = d.data();
                return { id: d.id, paymentId: x.paymentId, amount: x.amount, reason: x.reason, email: x.email || null, status: x.status, createdAt: toIso(x.createdAt), note: x.paymentNote || '' };
            });
            return json({ squareConnected: true, days, payments: withFlags, refunds });
        }

        if (action === 'refund') {
            if (!accessToken) return json({ error: 'Square is not connected here.' }, 400);
            const paymentId = cleanLine(body.paymentId, 200);
            const amount = Math.round(Number(body.amountCents));
            const reason = cleanLine(body.reason, 180) || 'Refund from CRATE TV';
            const nonce = cleanLine(body.nonce, 100);
            if (!paymentId || !nonce) return json({ error: 'Missing payment.' }, 400);

            // Re-check against Square's own record, not what the page showed.
            const pr = await fetch(`${squareBase()}/v2/payments/${encodeURIComponent(paymentId)}`, { headers: squareHeaders(accessToken) });
            if (!pr.ok) return json({ error: 'Square could not find that payment.' }, 404);
            const p: SquarePaymentRaw = (await pr.json()).payment;
            const problem = refundProblem({ amount: p.amount_money?.amount || 0, refunded: p.refunded_money?.amount || 0, status: p.status }, amount);
            if (problem) return json({ error: problem }, 400);

            const idempotencyKey = createHash('sha256').update(`crate-refund:${paymentId}:${amount}:${nonce}`).digest('hex').slice(0, 45);
            const rr = await fetch(`${squareBase()}/v2/refunds`, {
                method: 'POST', headers: squareHeaders(accessToken),
                body: JSON.stringify({ idempotency_key: idempotencyKey, payment_id: paymentId, amount_money: { amount, currency: 'USD' }, reason }),
            });
            const rd = await rr.json().catch(() => ({}));
            if (!rr.ok) return json({ error: rd.errors?.[0]?.detail || 'Square declined the refund.' }, 502);
            const refund = rd.refund || {};

            const ticketId = cleanLine(body.ticketId, 200);
            const email = cleanLine(body.email, 200);
            await db.collection('refunds').doc(refund.id || idempotencyKey).set({
                paymentId, amount, reason, status: refund.status || 'PENDING', squareRefundId: refund.id || null,
                paymentNote: p.note || '', email: email || null, ticketId: ticketId || null,
                markedTicketRefunded: body.markTicketRefunded === true,
                createdAt: FieldValue.serverTimestamp(), by: 'admin',
            });
            // A real cancellation (not a double charge): mark the ticket, so the
            // festival help desk never restores access for it.
            if (body.markTicketRefunded === true && ticketId) {
                await db.collection('festival_tickets').doc(ticketId).set({ refunded: true, refundedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
            }
            try {
                await db.collection('audit_logs').add({
                    action: 'REFUND_ISSUED', type: 'FINANCE', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
                    details: `$${(amount / 100).toFixed(2)} refunded on ${paymentId} (${p.note || 'payment'}) — ${reason}`,
                });
            } catch { /* never block on the log */ }

            if (body.notify === true && email && isValidEmail(email) && process.env.RESEND_API_KEY) {
                try {
                    const dollars = `$${(amount / 100).toFixed(2)}`;
                    await new Resend(process.env.RESEND_API_KEY).emails.send({
                        from: `CRATE TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`,
                        to: email,
                        subject: `Your ${dollars} refund from CRATE TV`,
                        html: renderBrandedEmail({
                            title: 'Refund on its way',
                            bodyHtml: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">Your ${dollars} refund is on its way</h1>
<p style="margin:0 0 12px;">We've refunded <strong>${dollars}</strong> for <strong>${escapeHtml(p.note || 'your purchase')}</strong> to the card you paid with${p.card_details?.card?.last_4 ? ` (ending ${escapeHtml(p.card_details.card.last_4)})` : ''}.</p>
<p style="margin:0 0 12px;">It usually shows up within 5–10 business days, depending on your bank.</p>
<p style="margin:0;">Thank you for watching on CRATE TV. Questions? Just reply to this email.</p>`,
                        }),
                    });
                } catch (e) { console.error('[admin-payments] refund email failed', e); }
            }
            return json({ success: true, status: refund.status || 'PENDING' });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-payments]', e);
        return json({ error: (e as Error).message }, 500);
    }
}
