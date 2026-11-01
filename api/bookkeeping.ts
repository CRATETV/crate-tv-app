// api/bookkeeping.ts — the Bookkeeping section of the admin (owner / master admin only).
//
// POST { password, action, ... }
//   list       → { year } entries for the year, per-person totals, W-9 status, years that have entries
//   add        → record a payment made outside CRATE's own payout button (check, PayPal, festival, expense…)
//   void       → { id, reason } cross out an entry (kept on record, left out of totals)
//   setTaxDoc  → { payee, email?, w9: 'none'|'requested'|'received', note? }
//   requestW9  → { payee, email } emails them the W-9 form and instructions, marks it "requested"
// Filmmaker payouts marked paid in Admin → Earnings & payouts are recorded here automatically.

import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { escapeHtml } from './_lib/validation.js';
import { BOOKKEEPING_COLLECTION, TAX_DOCS_COLLECTION, PAYOUT_ENTRY_PREFIX, W9_LINK, cleanEntry, entryFromPayout, payeeKey, totalsByPayee, type BookkeepingEntry, type W9Status } from './_lib/bookkeeping.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const isEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length < 200;
const toIso = (v: any): string => v?.toDate?.()?.toISOString?.() || (typeof v === 'string' ? v : new Date().toISOString());

// Payouts marked paid before Bookkeeping existed: add them once each.
async function addMissingPayouts(db: FirebaseFirestore.Firestore) {
    try {
        const snap = await db.collection('payout_requests').where('status', '==', 'completed').get();
        if (snap.empty) return;
        const refs = snap.docs.map(d => db.collection(BOOKKEEPING_COLLECTION).doc(`${PAYOUT_ENTRY_PREFIX}${d.id}`));
        const existing = await db.getAll(...refs);
        const batch = db.batch(); let n = 0;
        existing.forEach((e, i) => {
            if (e.exists) return;
            const d: any = snap.docs[i].data();
            const entry = entryFromPayout(snap.docs[i].id, d, toIso(d.completionDate));
            if (entry.amountCents <= 0) return;
            batch.set(refs[i], { ...entry, createdAt: FieldValue.serverTimestamp(), backfilled: true }); n++;
        });
        if (n) await batch.commit();
    } catch (e) { console.error('[bookkeeping] backfill failed:', e); }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body?.password))) return json({ error: 'Unauthorized' }, 401);
        if (getInitializationError()) return json({ error: 'Database unavailable.' }, 503);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable.' }, 503);
        const now = new Date().toISOString();

        switch (body.action) {
            case 'list': {
                await addMissingPayouts(db);
                const [snap, taxSnap] = await Promise.all([
                    db.collection(BOOKKEEPING_COLLECTION).orderBy('createdAt', 'desc').limit(2000).get(),
                    db.collection(TAX_DOCS_COLLECTION).get(),
                ]);
                const all = snap.docs.map(d => { const x: any = d.data(); return { id: d.id, ...x, createdAt: toIso(x.createdAt) }; }) as (BookkeepingEntry & { id: string })[];
                const years = [...new Set(all.map(e => Number(e.date.slice(0, 4))))].sort((a, b) => b - a);
                const year = Number(body.year) || years[0] || new Date().getFullYear();
                const entries = all.filter(e => e.date.startsWith(String(year))).sort((a, b) => (a.date < b.date ? 1 : -1));
                const taxDocs: Record<string, any> = {};
                taxSnap.forEach(d => { const x: any = d.data(); taxDocs[d.id] = { ...x, requestedAt: x.requestedAt ? toIso(x.requestedAt) : null, receivedAt: x.receivedAt ? toIso(x.receivedAt) : null, updatedAt: undefined }; });
                return json({ year, years: years.length ? years : [year], entries, totals: totalsByPayee(all, year), taxDocs });
            }
            case 'add': {
                const { entry, error } = cleanEntry(body.entry, now);
                if (!entry) return json({ error }, 400);
                const ref = await db.collection(BOOKKEEPING_COLLECTION).add({ ...entry, createdAt: FieldValue.serverTimestamp() });
                return json({ success: true, id: ref.id });
            }
            case 'void': {
                const id = typeof body.id === 'string' ? body.id : '';
                const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
                if (!id) return json({ error: 'Missing id.' }, 400);
                if (!reason) return json({ error: 'Add a short reason so the record makes sense later.' }, 400);
                await db.collection(BOOKKEEPING_COLLECTION).doc(id).set({ void: true, voidReason: reason, voidedAt: FieldValue.serverTimestamp() }, { merge: true });
                return json({ success: true });
            }
            case 'setTaxDoc': {
                const payee = typeof body.payee === 'string' ? body.payee.trim().slice(0, 120) : '';
                const w9: W9Status = ['none', 'requested', 'received'].includes(body.w9) ? body.w9 : 'none';
                if (!payee) return json({ error: 'Missing name.' }, 400);
                const update: Record<string, unknown> = { payee, w9, updatedAt: FieldValue.serverTimestamp() };
                if (isEmail(body.email)) update.email = body.email.trim();
                if (typeof body.note === 'string') update.note = body.note.trim().slice(0, 500);
                if (w9 === 'received') update.receivedAt = FieldValue.serverTimestamp();
                if (w9 === 'none') { update.receivedAt = FieldValue.delete(); update.requestedAt = FieldValue.delete(); }
                await db.collection(TAX_DOCS_COLLECTION).doc(payeeKey(payee).replace(/\//g, '-')).set(update, { merge: true });
                return json({ success: true });
            }
            case 'requestW9': {
                const payee = typeof body.payee === 'string' ? body.payee.trim().slice(0, 120) : '';
                if (!payee) return json({ error: 'Missing name.' }, 400);
                if (!isEmail(body.email)) return json({ error: 'Add a valid email address for them first.' }, 400);
                if (!process.env.RESEND_API_KEY) return json({ error: 'Email isn’t set up on the server (RESEND_API_KEY).' }, 503);
                const email = body.email.trim();
                const reply = process.env.MAIL_INBOUND_ADDRESS || 'cratetiv@gmail.com';
                const first = escapeHtml(payee.split(' ')[0]);
                const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
                    from: `Crate TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`,
                    to: [email],
                    reply_to: reply,
                    subject: 'Quick tax form before your CRATE TV payout (W-9)',
                    html: renderBrandedEmail({
                        title: 'One quick form before your payout',
                        bodyHtml: `<p style="margin:0 0 12px;">Hi ${first},</p>
<p style="margin:0 0 12px;">Before CRATE TV sends your first payout, we need a W-9. It’s a one-page IRS form with your name, address and tax ID. We keep it on file so we can report what we paid you at tax time, as the law requires.</p>
<p style="margin:0 0 12px;"><a href="${W9_LINK}">Download the W-9 here</a>, fill it in and send it back as a reply to this email. It only takes a few minutes, and you only do it once.</p>
<p style="margin:0 0 12px;">Please send it as a PDF attachment in a reply to this email. Don’t type your Social Security number into any website or message.</p>
<p style="margin:0;">If you live outside the US, reply and tell us. You’ll fill out a different form (W-8BEN).</p>`,
                    }),
                });
                if (error) return json({ error: `Couldn’t send: ${error.message || 'email error'}` }, 502);
                await db.collection(TAX_DOCS_COLLECTION).doc(payeeKey(payee).replace(/\//g, '-')).set({ payee, email, w9: 'requested', requestedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
                void data;
                return json({ success: true });
            }
            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        console.error('[bookkeeping]', e);
        return json({ error: (e as Error).message }, 500);
    }
}
