import { createHmac, timingSafeEqual } from 'crypto';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';

/**
 * Square Webhook receiver.
 *
 * This endpoint did not exist before — Square has been retrying delivery to
 * https://cratetv.net/api/square-webhook and getting a 404 every time (433
 * failed attempts as of this fix), and would have disabled the subscription
 * entirely by 2026-07-08 if left unfixed.
 *
 * What it does:
 *  1. Verifies the request actually came from Square (HMAC-SHA256 signature
 *     over notificationUrl + raw body — see Square's webhook docs). Anyone
 *     can POST to a public URL, so this step is what stops a forged request
 *     from being trusted.
 *  2. Records every event to `square_webhook_events` in Firestore, so there's
 *     a real audit trail of what Square has told us.
 *  3. Flags refunds and disputes/chargebacks into the Error Log (Admin Panel)
 *     so a human notices — the existing purchase flow has no other way to
 *     find out about these, since it only knows about a payment at the
 *     moment it's made, not what happens to it afterward.
 *
 * It deliberately does NOT auto-revoke a user's unlocked content on a
 * refund/dispute event. That's a judgment call worth a person's eyes first,
 * not something to do silently from a webhook on day one.
 */

const isProduction = process.env.VERCEL_ENV === 'production';

function getSignatureKey(): string | undefined {
    return isProduction
        ? process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
        : (process.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
}

function getNotificationUrl(): string {
    return process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || 'https://cratetv.net/api/square-webhook';
}

function verifySquareSignature(rawBody: string, signatureHeader: string | null, signatureKey: string, notificationUrl: string): boolean {
    if (!signatureHeader) return false;
    try {
        const expected = createHmac('sha256', signatureKey)
            .update(notificationUrl + rawBody)
            .digest('base64');

        const expectedBuf = Buffer.from(expected);
        const receivedBuf = Buffer.from(signatureHeader);
        if (expectedBuf.length !== receivedBuf.length) return false;
        return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
        return false;
    }
}

// Event types where a human should be alerted, not just logged for the record.
const ALERT_WORTHY_EVENTS = new Set([
    'refund.created',
    'refund.updated',
    'dispute.created',
    'dispute.state.updated',
    'dispute.evidence.created',
]);

export async function POST(request: Request) {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-square-hmacsha256-signature');
    const signatureKey = getSignatureKey();
    const notificationUrl = getNotificationUrl();

    if (!signatureKey) {
        // Misconfiguration, not a malicious request — log it so it's visible
        // to us, but tell Square not to retry (retrying won't fix a missing
        // env var). Once SQUARE_WEBHOOK_SIGNATURE_KEY is set in Vercel this
        // path stops firing.
        logServerError('api/square-webhook', new Error('SQUARE_WEBHOOK_SIGNATURE_KEY is not configured'));
        return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 200 });
    }

    const isValid = verifySquareSignature(rawBody, signatureHeader, signatureKey, notificationUrl);
    if (!isValid) {
        // Genuinely untrusted request — reject it. Square will retry a few
        // times on a real delivery hiccup, but won't keep retrying forever.
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403 });
    }

    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch (error) {
        logServerError('api/square-webhook', error, { rawBodyPreview: rawBody.slice(0, 500) });
        return new Response(JSON.stringify({ error: 'Malformed event body' }), { status: 400 });
    }

    try {
        const initError = getInitializationError();
        const db = !initError ? getAdminDb() : null;

        if (db) {
            await db.collection('square_webhook_events').add({
                eventId: event.event_id || null,
                type: event.type || 'unknown',
                merchantId: event.merchant_id || null,
                data: event.data || null,
                receivedAt: FieldValue.serverTimestamp(),
            });
        }

        if (ALERT_WORTHY_EVENTS.has(event.type)) {
            // Route through the error logger so it surfaces in Admin Panel →
            // Error Log where it'll actually get seen, not just sit in a
            // collection nobody's watching.
            logServerError(`square-webhook:${event.type}`, new Error(`Square ${event.type} event received — review in Square Dashboard.`), {
                eventId: event.event_id,
                objectId: event.data?.id,
            });
        }
    } catch (error) {
        // Recording the event failed, but we DID verify it came from Square —
        // log it and still ack with 200 so Square doesn't spend its retry
        // budget on a problem retrying won't fix (a Firestore write failure).
        logServerError('api/square-webhook', error, { eventType: event?.type });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}
