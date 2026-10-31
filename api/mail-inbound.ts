// api/mail-inbound.ts — receives emails sent to the dashboard mailbox.
//
// Resend calls this address (a "webhook") each time an email arrives at the
// receiving address. We check Resend's signature, fetch the full email, and
// save it to the dashboard Received folder. Set up in the Resend dashboard:
//   Webhooks → Add → this URL (https://cratetv.net/api/mail-inbound) → event "email.received"
// and put its signing secret in Vercel as RESEND_WEBHOOK_SECRET.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { MAIL_COLLECTION, verifyWebhookSignature, parseInboundEvent, buildInboundRecord } from './_lib/mailLog.js';
import { notifyOwnerMailReceived } from './_lib/partnerEmails.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request) {
    try {
        const secret = process.env.RESEND_WEBHOOK_SECRET || '';
        if (!secret) return json({ error: 'Mailbox is not set up yet.' }, 503);

        const payload = await request.text();
        const ok = verifyWebhookSignature({
            id: request.headers.get('svix-id'),
            timestamp: request.headers.get('svix-timestamp'),
            signature: request.headers.get('svix-signature'),
            payload, secret,
        });
        if (!ok) return json({ error: 'Bad signature.' }, 401);

        let body: any;
        try { body = JSON.parse(payload); } catch { return json({ error: 'Bad request.' }, 400); }
        const event = parseInboundEvent(body);
        if (!event) return json({ ignored: true });

        if (getInitializationError()) return json({ error: 'Database unavailable.' }, 503);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable.' }, 503);

        // Fetch the full email (body text, real sender name, attachment sizes).
        let full: any = null;
        try {
            const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.emailId)}`, {
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}` },
            });
            if (res.ok) full = await res.json();
            else console.error('[mail-inbound] could not fetch email', event.emailId, res.status);
        } catch (e) {
            console.error('[mail-inbound] fetch failed:', e);
        }

        // The email's own id is the document id, so a repeat delivery never makes a duplicate.
        const ref = db.collection(MAIL_COLLECTION).doc(`in_${event.emailId}`);
        const alreadySaved = (await ref.get()).exists;
        const record = buildInboundRecord(event, full, new Date().toISOString());
        await ref.set(record, { merge: true });
        // A short "you have a new email" note to the owner (once per email, not on retries).
        if (!alreadySaved) {
            notifyOwnerMailReceived(record.fromName || record.fromEmail, record.subject, record.text).catch(e => console.error('[mail-inbound] owner alert failed', e));
        }
        return json({ success: true });
    } catch (e) {
        console.error('[mail-inbound] failed:', e);
        // A 5xx makes Resend try again later.
        return json({ error: 'Could not save the email.' }, 500);
    }
}
