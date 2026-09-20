import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { computeAllFilmmakerBalances } from './_lib/filmmakerBalance.js';
import { normalize } from './_lib/creditMatch.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { cleanLine } from './_lib/validation.js';

const MINIMUM_PAYOUT_CENTS = 500; // $5.00 — keep in sync with the dashboard and notify-payout-threshold-cron

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * A filmmaker asking to be paid.
 *
 * This used to trust everything in the request body — the name, the email the money
 * is sent to, and the amount — with no sign-in at all, so anyone could file a request
 * as any filmmaker, for any amount, with their own email. Now, like
 * get-filmmaker-analytics, WHO is asking comes from a verified sign-in and HOW MUCH
 * they're owed is computed here from real earnings; nothing about identity or money
 * is taken from the request.
 */
export async function POST(request: Request) {
    try {
        if (!rateLimit(`request-payout:${getIP(request)}`, 10, 60_000)) {
            return json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429);
        }

        const body = await request.json().catch(() => ({}));
        const { idToken } = body || {};

        if (typeof idToken !== 'string' || !idToken) {
            return json({ error: 'Sign in required.' }, 401);
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('DB fail');
        let uid: string;
        let tokenEmail: string | undefined;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
            tokenEmail = decoded.email;
        } catch {
            return json({ error: 'Invalid or expired session. Please sign in again.' }, 401);
        }

        const userData = (await db.collection('users').doc(uid).get()).data();
        if (!userData?.isFilmmaker) {
            return json({ error: 'This account is not a verified filmmaker.' }, 403);
        }
        const directorName: string | undefined = userData.verifiedFilmmakerName || userData.name;
        const email: string | undefined = tokenEmail || userData.email;
        if (!directorName || !email) {
            return json({ error: 'No verified filmmaker name or email on this account.' }, 403);
        }

        // What they are actually owed — same calculation behind their dashboard number.
        const balances = await computeAllFilmmakerBalances(db);
        const balance = balances.get(normalize(directorName))?.balance ?? 0;
        if (balance < MINIMUM_PAYOUT_CENTS) {
            return json({ error: `The minimum payout is $${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}. Your available balance is $${(balance / 100).toFixed(2)}.` }, 400);
        }

        // Film titles are only a note for the admin; the amount and identity above are what matter.
        const filmTitles = Array.isArray(body.filmTitles)
            ? body.filmTitles.slice(0, 50).map((t: unknown) => cleanLine(t, 200)).filter(Boolean)
            : [];

        // One open request at a time, checked and written in a single transaction so two
        // quick clicks (or two tabs) can't both slip through.
        const requests = db.collection('payout_requests');
        const created = await db.runTransaction(async tx => {
            const open = await tx.get(requests.where('directorName', '==', directorName).where('status', '==', 'pending'));
            if (!open.empty) return false;
            tx.set(requests.doc(), {
                directorName,
                amount: balance,
                email,
                filmTitles,
                status: 'pending',
                requestedByUid: uid,
                timestamp: new Date().toISOString(),
                // get-payouts.ts orders by this field — without it, requests are
                // silently excluded from that query entirely.
                requestDate: FieldValue.serverTimestamp(),
            });
            return true;
        });
        if (!created) {
            return json({ error: 'You already have a payout request waiting to be paid.' }, 409);
        }

        return json({ success: true, amount: balance, message: 'Payout request submitted successfully.' });

    } catch (error) {
        console.error('request-payout error:', error);
        return json({ error: 'Could not submit your payout request. Please try again.' }, 500);
    }
}
