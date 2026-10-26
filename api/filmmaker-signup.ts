// Path: /api/filmmaker-signup
//
// Opens a filmmaker dashboard (earnings, payout method, payout requests) for
// a name credited on a CRATE film.
//
// SECURITY (Oct 2026 audit): this used to approve anyone who typed a
// credited name, and would even switch the dashboard on for SOMEONE ELSE'S
// existing account given just their email. A stranger could open "Jane
// Doe"'s dashboard, set their own PayPal and request her money. Now:
//   • an existing account is only changed when its owner is signed in;
//   • the dashboard opens straight away only when the email is one CRATE
//     already has for that filmmaker (api/_lib/filmmakerVerify.ts);
//   • anyone else waits for you to approve them in Admin → Earnings & payouts.
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
import { findCreditMatch, normalize } from './_lib/creditMatch.js';
import { onFileMatch, loadOnFileRecords } from './_lib/filmmakerVerify.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { cleanLine, escapeHtml, isValidEmail } from './_lib/validation.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { sendEmailConfirmation } from './_lib/emailVerify.js';

const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Creators who should automatically get both Actor and Filmmaker roles.
const DUAL_ROLE_NAMES = new Set([
    'salome',
    'salome denoon',
    'michael dwayne paylor',
    'michelle reale-opalesky',
    'darrah lashley',
    'bubacarr sarge',
    'joshua daniel',
]);

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Switches the filmmaker dashboard on for an account (also used by admin approval). */
export async function grantFilmmaker(db: FirebaseFirestore.Firestore, auth: any, uid: string, name: string, via: string) {
    const user = await auth.getUser(uid);
    const existing = user.customClaims || {};
    const claims = { ...existing, isFilmmaker: true, isActor: existing.isActor === true || DUAL_ROLE_NAMES.has(normalize(name)) };
    await auth.setCustomUserClaims(uid, claims);
    await db.collection('users').doc(uid).set({
        isFilmmaker: true,
        isActor: claims.isActor,
        // The identity get-filmmaker-analytics / payouts trust. Set only here.
        verifiedFilmmakerName: name,
        filmmakerVerifiedVia: via,
        filmmakerVerifiedAt: new Date().toISOString(),
    }, { merge: true });
}

export async function POST(request: Request) {
    try {
        if (!rateLimit(`filmmaker-signup:${getIP(request)}`, 8, 60 * 60_000)) {
            return json({ error: 'Too many attempts. Please try again in an hour.' }, 429);
        }
        const body = await request.json().catch(() => ({}));
        const name = cleanLine(body.name, 120);
        const password = typeof body.password === 'string' ? body.password : '';
        if (!name) return json({ error: 'Please enter your name exactly as it appears in your film credits.' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Database or Auth connection failed.');

        // 1. The name must be credited on a film.
        const moviesSnapshot = await db.collection('movies').get();
        const movies = moviesSnapshot.docs.map(d => ({ key: d.id, ...d.data() } as Movie));
        if (!findCreditMatch(movies, name)) {
            return json({ error: 'Name not found in our records as a director or producer. Please ensure it matches the film credits exactly.' }, 404);
        }

        // 2. Whose account is this?
        let uid: string;
        let email: string;
        let emailConfirmed = false;
        const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
        if (bearer) {
            try {
                const decoded = await auth.verifyIdToken(bearer);
                uid = decoded.uid;
                email = String(decoded.email || '').toLowerCase();
                emailConfirmed = decoded.email_verified === true;
            } catch {
                return json({ error: 'Your sign-in expired. Please sign in again.' }, 401);
            }
            if (!email) return json({ error: 'Your account needs an email address.' }, 400);
        } else {
            email = cleanLine(body.email, 200).toLowerCase();
            if (!isValidEmail(email)) return json({ error: 'Please enter a valid email address.' }, 400);
            if (password.length < 6) return json({ error: 'Password must be at least 6 characters long.' }, 400);
            try {
                await auth.getUserByEmail(email);
                // Never change an account its owner hasn't signed in to.
                return json({ error: 'This email already has a Crate account. Sign in first, then open this page again to set up your dashboard.', needsSignIn: true }, 409);
            } catch (e: any) {
                if (e?.code !== 'auth/user-not-found') throw e;
            }
            const created = await auth.createUser({ email, password, displayName: name });
            uid = created.uid;
            await db.collection('users').doc(uid).set({ name, email }, { merge: true });
        }

        // Already set up for this name: nothing to do.
        const current = (await db.collection('users').doc(uid).get()).data() || {};
        if (current.isFilmmaker && normalize(current.verifiedFilmmakerName || '') === normalize(name)) {
            return json({ success: true, message: 'Your Filmmaker Dashboard is already active.' });
        }

        // 3. Approve now if CRATE already has this email for this filmmaker.
        const via = onFileMatch(name, email, movies, await loadOnFileRecords(db, name, email));
        if (via && !emailConfirmed) {
            // Anyone can make an account with someone else's email, so the
            // email must be confirmed before it counts as proof.
            await db.collection('filmmaker_claims').doc(uid).set({
                name, email, status: 'pending', awaiting: 'email confirmation', createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            await sendEmailConfirmation(auth, email, {
                continueUrl: 'https://cratetv.net/filmmaker-signup',
                why: 'You asked to open your CRATE Filmmaker Dashboard.',
            });
            return json({
                success: true,
                pending: true,
                message: `We just emailed ${email} a link to confirm it's yours. Tap it, then sign in and open this page again to switch on your dashboard.`,
            });
        }
        if (via) {
            await grantFilmmaker(db, auth, uid, name, via);
            await db.collection('filmmaker_claims').doc(uid).set({ name, email, status: 'approved', via, decidedAt: FieldValue.serverTimestamp() }, { merge: true });
            return json({ success: true, message: 'Your Filmmaker Dashboard is now active.' });
        }

        // 4. Otherwise a person checks it.
        await db.collection('filmmaker_claims').doc(uid).set({
            name, email, status: 'pending', createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        if (process.env.RESEND_API_KEY) {
            try {
                const settings = (await db.collection('content').doc('settings').get()).data();
                await new Resend(process.env.RESEND_API_KEY).emails.send({
                    from: `Crate TV Alerts <${fromEmail}>`,
                    to: [settings?.technicalEmail || 'cratetiv@gmail.com'],
                    subject: `Filmmaker dashboard request: ${name.replace(/[\r\n]/g, ' ')}`,
                    html: renderBrandedEmail({
                        title: 'Filmmaker dashboard request',
                        bodyHtml: `<p style="margin:0 0 12px;"><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) asked for the filmmaker dashboard for that name.</p>
<p style="margin:0 0 12px;">CRATE doesn't have this email on file for them, so it's waiting for you. Only approve it if you're sure it's really them: the dashboard shows their earnings and lets them choose where their money is sent.</p>
<p style="margin:0;">Approve or decline it in Admin → Earnings &amp; payouts.</p>`,
                    }),
                });
            } catch (e) { console.error('[filmmaker-signup] admin email failed', e); }
        }
        return json({
            success: true,
            pending: true,
            message: "Thanks! We'll confirm it's you and switch on your Filmmaker Dashboard, usually within a day or two. You can sign in to your Crate account meanwhile.",
        });
    } catch (error) {
        console.error('Error in filmmaker-signup API:', error);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
