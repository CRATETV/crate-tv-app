// api/admin-mail.ts — the dashboard mailbox (admin only).
//
// POST { password, action, ... }
//   list      → { folder: 'in' | 'out', limit? } newest first
//   markRead  → { id }
//   original  → { id } a fresh download link for the original received email
//                (with its attachments), because those links expire quickly
//   unread    → { count } received emails not opened yet (for the sidebar badge)
//   delete    → { ids } permanently deletes saved emails (sent or received)
//   hide      → { ids } removes website messages (contact form, talent inquiries,
//                film submissions) from the inbox view; the original record stays
//   hidden    → ids hidden that way
//   statuses  → { map } the Open / Waiting / Solved mark on each message (no mark = Open)
//   setStatus → { id, status } mark a message open | waiting | solved
//   helpRequests → the newest Festival Help reports, shown in Received next to emails
//   getSignatures / saveSignatures → the signatures you can pick when writing (saving: owner only)

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword, isMasterAdmin, canUseTab } from './_lib/adminAuth.js';
import { MAIL_COLLECTION, SIGNATURES_DOC, normalizeSignatures, visibleSignatures, INQUIRY_MAIL_PREFIX, buildInquiryRecord, inboundBodyText, explainReceiveFailure } from './_lib/mailLog.js';

const HIDDEN_COLLECTION = 'mail_hidden';
const STATUS_COLLECTION = 'mail_status';     // id -> { status: 'waiting' | 'solved' }; no document means Open
const DELETED_COLLECTION = 'mail_deleted';   // ids of website-request copies that were deleted on purpose

// Premiere / festival requests sent before the dashboard copy existed: add the
// missing ones to the Received folder (once each; the newest 50 are checked).
async function addMissingInquiries(db: FirebaseFirestore.Firestore) {
    try {
        const snap = await db.collection('inquiries').orderBy('createdAt', 'desc').limit(50).get();
        if (snap.empty) return;
        const refs = snap.docs.map(d => db.collection(MAIL_COLLECTION).doc(`${INQUIRY_MAIL_PREFIX}${d.id}`));
        // Copies you deleted are remembered, so they are not put back the next time the inbox loads.
        const removed = await db.getAll(...refs.map(r => db.collection(DELETED_COLLECTION).doc(r.id)));
        const existing = (await db.getAll(...refs)).map((e, i) => (removed[i].exists ? { exists: true } as any : e));
        const batch = db.batch();
        let n = 0;
        existing.forEach((e, i) => {
            if (e.exists) return;
            const d: any = snap.docs[i].data();
            const when = d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString();
            batch.set(refs[i], { ...buildInquiryRecord(d, when), read: d.status === 'new' ? false : true });
            n++;
        });
        if (n) await batch.commit();
    } catch (e) { console.error('[admin-mail] inquiries copy failed:', e); }
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await verifyAdminPassword(body?.password)) || !(await canUseTab(body?.password, ['email']))) return json({ error: 'Unauthorized' }, 401);
        if (getInitializationError()) return json({ error: 'Database unavailable.' }, 503);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable.' }, 503);

        switch (body.action) {
            case 'list': {
                const folder = body.folder === 'out' ? 'out' : 'in';
                const limit = Math.min(Math.max(Number(body.limit) || 60, 1), 200);
                if (folder === 'in') await addMissingInquiries(db);
                // One sort on one field needs no special database index; the folder is picked here.
                const snap = await db.collection(MAIL_COLLECTION).orderBy('createdAt', 'desc').limit(400).get();
                const messages = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.direction === folder).slice(0, limit);
                const unread = folder === 'in' ? messages.filter((m: any) => m.read === false).length : 0;
                return json({ messages, unread });
            }
            case 'markRead': {
                const id = typeof body.id === 'string' ? body.id : '';
                if (!id) return json({ error: 'Missing id.' }, 400);
                await db.collection(MAIL_COLLECTION).doc(id).set({ read: true }, { merge: true });
                return json({ success: true });
            }
            case 'original': {
                const id = typeof body.id === 'string' ? body.id : '';
                const doc = id ? await db.collection(MAIL_COLLECTION).doc(id).get() : null;
                const resendId = doc?.data()?.resendId;
                if (!doc?.exists || doc.data()?.direction !== 'in' || !resendId) return json({ error: 'That email was not found.' }, 404);
                const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(resendId)}`, {
                    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}` },
                });
                if (!res.ok) return json({ error: 'The original could not be fetched right now.' }, 502);
                const full: any = await res.json();
                const url = full?.raw?.download_url;
                if (!url) return json({ error: 'No original file is available for this email.' }, 404);
                return json({ url });
            }
            // Loads the message text for a received email that was saved without it.
            case 'refetch': {
                const id = typeof body.id === 'string' ? body.id : '';
                const ref = id ? db.collection(MAIL_COLLECTION).doc(id) : null;
                const doc = ref ? await ref.get() : null;
                const resendId = doc?.data()?.resendId;
                if (!ref || !doc?.exists || doc.data()?.direction !== 'in' || !resendId) return json({ error: 'That email was not found.' }, 404);
                const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(resendId)}`, {
                    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}` },
                });
                if (!res.ok) return json({ error: explainReceiveFailure(res.status) }, 502);
                const text = inboundBodyText(await res.json()).slice(0, 60_000);
                if (!text) return json({ text: '', empty: true });
                await ref.set({ text }, { merge: true });
                return json({ text });
            }
            case 'unread': {
                await addMissingInquiries(db);
                const snap = await db.collection(MAIL_COLLECTION).orderBy('createdAt', 'desc').limit(400).get();
                return json({ count: snap.docs.filter(d => d.data().direction === 'in' && d.data().read === false).length });
            }
            case 'delete': {
                const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x: unknown) => typeof x === 'string' && x).slice(0, 100);
                if (!ids.length) return json({ error: 'Nothing selected.' }, 400);
                const batch = db.batch();
                ids.forEach((id: string) => {
                    batch.delete(db.collection(MAIL_COLLECTION).doc(id));
                    // Premiere / festival request copies would otherwise be re-created on the next load.
                    if (id.startsWith(INQUIRY_MAIL_PREFIX)) batch.set(db.collection(DELETED_COLLECTION).doc(id), { deletedAt: new Date().toISOString() });
                });
                await batch.commit();
                return json({ success: true, deleted: ids.length });
            }
            case 'hide': {
                const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x: unknown) => typeof x === 'string' && x).slice(0, 100);
                if (!ids.length) return json({ error: 'Nothing selected.' }, 400);
                const batch = db.batch();
                ids.forEach((id: string) => batch.set(db.collection(HIDDEN_COLLECTION).doc(id), { hiddenAt: new Date().toISOString() }));
                await batch.commit();
                return json({ success: true });
            }
            case 'hidden': {
                const snap = await db.collection(HIDDEN_COLLECTION).get();
                return json({ ids: snap.docs.map(d => d.id) });
            }
            case 'statuses': {
                const snap = await db.collection(STATUS_COLLECTION).get();
                const map: Record<string, string> = {};
                snap.forEach(d => { const st = d.data()?.status; if (st === 'waiting' || st === 'solved') map[d.id] = st; });
                return json({ map });
            }
            case 'setStatus': {
                const id = typeof body.id === 'string' ? body.id.trim().slice(0, 200) : '';
                const st = body.status;
                if (!id || id.includes('/') || !['open', 'waiting', 'solved'].includes(st)) return json({ error: 'Bad request.' }, 400);
                const ref = db.collection(STATUS_COLLECTION).doc(id);
                if (st === 'open') await ref.delete();
                else await ref.set({ status: st, updatedAt: new Date().toISOString() });
                return json({ success: true });
            }
            case 'helpRequests': {
                const snap = await db.collection('help_requests').orderBy('createdAt', 'desc').limit(30).get();
                return json({ requests: snap.docs.map(d => {
                    const r: any = d.data();
                    return {
                        id: d.id, contactEmail: r.contactEmail || '', accountEmail: r.accountEmail || '', category: r.category || 'other',
                        message: r.message || '', page: r.page || '', userAgent: r.userAgent || '',
                        tickets: Array.isArray(r.tickets) ? r.tickets : [], createdAt: r.createdAt?.toDate?.()?.toISOString?.() || null,
                    };
                }) });
            }
            case 'getSignatures': {
                const owner = await isMasterAdmin(body.password);
                const doc = await db.doc(SIGNATURES_DOC).get();
                const all = normalizeSignatures(doc.data()?.list);
                return json({ signatures: visibleSignatures(all, owner), isOwner: owner });
            }
            case 'saveSignatures': {
                if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the owner can change signatures.' }, 403);
                const list = normalizeSignatures(body.signatures);
                await db.doc(SIGNATURES_DOC).set({ list, updatedAt: new Date().toISOString() });
                return json({ success: true, signatures: list });
            }
            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        console.error('[admin-mail] failed:', e);
        return json({ error: 'Something went wrong with the mailbox. Reload and try again; if it keeps happening, tell Claude the exact words you see here.' }, 500);
    }
}
