// POST /api/request-invite  { name, email, note?, movieKey?, movieTitle? }
// Public. Saves the request and puts it in Studio Mail → Received (unread), so it
// can be answered with an invite code. Cleaning: api/_lib/inviteRequest.ts.
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { cleanInviteRequest } from './_lib/inviteRequest.js';
import { MAIL_COLLECTION, buildInquiryRecord } from './_lib/mailLog.js';
import { notifyOwnerMailReceived } from './_lib/partnerEmails.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        if (!rateLimit(`request-invite:${getIP(request)}`, 5, 60 * 60_000)) return json({ error: 'Too many requests. Please try again later.' }, 429);
        const result = cleanInviteRequest(await request.json().catch(() => null));
        if (!result.ok) return result.spam ? json({ success: true }) : json({ error: result.error }, 400);
        const q = result.request;

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        const ref = await db.collection('invite_requests').add({ ...q, status: 'new', createdAt: FieldValue.serverTimestamp() });
        const record = buildInquiryRecord({
            kind: 'invite', name: q.name, email: q.email, message: q.note,
            details: [['Screening', q.movieTitle || 'Crate TV (general)'], ...(q.movieKey ? [['Film key', q.movieKey] as [string, string]] : [])],
        }, new Date().toISOString());
        await db.collection(MAIL_COLLECTION).doc(`inv_${ref.id}`).set(record).catch(e => console.error('[request-invite] dashboard copy failed:', e));
        notifyOwnerMailReceived(q.name, record.subject, record.text).catch(e => console.error('[request-invite] owner alert failed:', e));
        return json({ success: true });
    } catch (e) {
        console.error('[request-invite]', e);
        return json({ error: 'Something went wrong. Please try again in a moment.' }, 500);
    }
}
