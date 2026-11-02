// Public unsubscribe endpoint for the Zine newsletter.
//
// Linked from the footer of every bulk dispatch (see send-bulk-email.ts) and
// the monthly spotlight email (see cron-monthly-spotlight.ts). No admin key —
// anyone who knows an email address can mark it cancelled, same trust level
// as every other "enter your email" unsubscribe page. Worst case is someone
// stops a stranger's newsletter, not a security hole: it only ever flips a
// marketing-email flag, never anything paid or account-related.
//
// Idempotent and silent on a miss (doesn't reveal whether an email is
// subscribed), so this also can't be used to confirm who's on the list.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { isValidEmail } from './_lib/validation.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request) {
    try {
        if (!rateLimit(`unsubscribe:${getIP(request)}`, 10, 60 * 60_000)) {
            return json({ error: 'Too many requests. Please try again later.' }, 429);
        }

        const { email } = await request.json().catch(() => ({}));
        if (typeof email !== 'string' || !isValidEmail(email)) {
            return json({ error: 'Please enter a valid email.' }, 400);
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        const key = email.toLowerCase().trim();

        // The newsletter itself — the "Subscribers" list in the admin panel.
        const zineRef = db.collection('zine_subscriptions').doc(key);
        const zineExisting = await zineRef.get();
        if (zineExisting.exists) {
            await zineRef.set({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() }, { merge: true });
        }

        // Every account signup also gets the monthly spotlight email (see
        // cron-monthly-spotlight.ts), from a separate 'subscriptions'
        // collection keyed the same way. Without this, someone with an
        // account but no newsletter signup could click "Unsubscribe" and
        // keep getting spotlight emails forever — this flag is what that
        // cron checks to skip them.
        const accountRef = db.collection('subscriptions').doc(key);
        const accountExisting = await accountRef.get();
        if (accountExisting.exists) {
            await accountRef.set({ optedOut: true, optedOutAt: FieldValue.serverTimestamp() }, { merge: true });
        }

        // Same response whether or not the address was ever subscribed —
        // nothing here confirms or denies list membership.
        return json({ success: true });
    } catch (error) {
        console.error('unsubscribe-newsletter error:', error);
        // A failure here shouldn't look like anything went wrong to the
        // person clicking the link — same reasoning as subscribe-newsletter.ts.
        return json({ success: true, warning: 'Unsubscribe may not have been recorded on the server.' }, 200);
    }
}
