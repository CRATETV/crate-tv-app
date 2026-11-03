import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { signAdminSession, verifyAdminSession, newSessionNonce, SESSION_TTL_MS } from './_lib/adminSession.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { logServerError } from './_lib/logError.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
    const ip = getIp(request);
    try {
        // This endpoint gates the entire admin panel — payouts, festival
        // control, ticket pricing, everything — and had no throttling at
        // all, meaning it could be brute-forced with unlimited password
        // guesses. 8 attempts per 5 minutes per IP is generous for a real
        // admin who mistypes, but shuts down a scripted guessing attempt.
        const limitKey = getIP(request) || ip || 'unknown';
        if (!rateLimit(`admin-login:${limitKey}`, 8, 5 * 60_000)) {
            return new Response(JSON.stringify({ success: false, error: 'Too many attempts. Try again in a few minutes.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { password: __raw_password, name, idToken, action } = await request.json();
        const password = String(await resolveAdminCredential(__raw_password) || '');

        // "Who am I?" check used by the admin panel on reload, so a still-valid
        // session pass restores the session without re-typing the password.
        if (action === 'session') {
            const session = verifyAdminSession(__raw_password);
            if (!session || !password) {
                return new Response(JSON.stringify({ success: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ success: true, role: session.role, operatorName: session.name, expiresAt: session.exp }), {
                status: 200, headers: { 'Content-Type': 'application/json' },
            });
        }

        // "Log out other devices" for staff — see adminSession.ts. Re-stamps
        // this collaborator's own session with a fresh nonce (killing any
        // other pass issued to them, on any other device) and hands back a
        // matching fresh pass so THIS device stays signed in. Only works for
        // a currently-valid collab:<docId> pass — can't be used to target
        // anyone else's session, and doesn't apply to env:*/pay:* subs
        // (nothing to re-stamp: see the comment on newSessionNonce).
        if (action === 'claim-session') {
            const session = verifyAdminSession(__raw_password);
            if (!session) {
                return new Response(JSON.stringify({ success: false, error: 'Your session already expired — sign in again.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
            if (!session.sub.startsWith('collab:')) {
                return new Response(JSON.stringify({ success: false, error: "This sign-in method doesn't support logging out other devices." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            const initError = getInitializationError();
            const db = !initError ? getAdminDb() : null;
            if (!db) throw new Error('Database terminal offline.');
            const docId = session.sub.slice('collab:'.length);
            const doc = await db.collection('collaborator_access').doc(docId).get();
            const docData = doc.data();
            if (!doc.exists || !docData || docData.status === 'revoked') {
                return new Response(JSON.stringify({ success: false, error: 'This access has been revoked.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
            // Without this, a pass that's ALREADY been superseded by a newer
            // sign-in elsewhere (but hasn't hit its 12h expiry) could call
            // this endpoint to re-stamp itself back to current — exactly the
            // takeover this feature exists to prevent. Only the canonical
            // (not-yet-superseded) pass may claim. A doc with no
            // sessionNonce yet (nobody's logged in since this shipped) has
            // no canonical pass to defer to, so that case is let through —
            // same bootstrap allowance as resolveAdminCredential.
            if (docData.sessionNonce && session.nonce !== docData.sessionNonce) {
                return new Response(JSON.stringify({ success: false, error: 'This session was already replaced by a newer sign-in.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
            const nonce = newSessionNonce();
            await doc.ref.set({ sessionNonce: nonce }, { merge: true });
            const sessionToken = signAdminSession({ sub: session.sub, role: session.role, name: session.name, via: session.via, nonce });
            return new Response(JSON.stringify({ success: true, sessionToken, expiresAt: Date.now() + SESSION_TTL_MS }), {
                status: 200, headers: { 'Content-Type': 'application/json' },
            });
        }

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const festivalAdminPassword = process.env.FESTIVAL_ADMIN_PASSWORD;

        const validPasswords: Record<string, string | undefined> = {
            super_admin: primaryAdminPassword,
            master: masterPassword,
            festival_admin: festivalAdminPassword,
        };

        const initError = getInitializationError();
        const db = !initError ? getAdminDb() : null;
        if (!db) throw new Error("Database terminal offline.");

        let role = '';
        let targetDirector = '';
        let payoutType = '';
        let jobTitle = '';
        let sub = '';                 // what the signed session pass points at
        let displayName = String(name || '').trim().slice(0, 60);
        let via: 'password' | 'account' = 'password';

        // 0. STAFF SIGN-IN WITH THEIR OWN CRATE ACCOUNT
        //    No shared key to pass around: a staff member signs into Crate as
        //    themselves, and if their verified email is attached to an active
        //    staff record (Permissions tab), they get that record's access.
        //    The owner can do the same by listing her email in the Vercel env
        //    var ADMIN_OWNER_EMAILS (comma-separated).
        if (idToken) {
            const auth = getAdminAuth();
            if (!auth) throw new Error('Auth offline.');
            let email = '';
            try {
                const decoded = await auth.verifyIdToken(String(idToken));
                if (!decoded.email || decoded.email_verified === false) {
                    return new Response(JSON.stringify({ success: false, error: 'Verify your email address on your Crate account first.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
                }
                email = decoded.email.toLowerCase();
                displayName = displayName || decoded.name || email;
            } catch {
                return new Response(JSON.stringify({ success: false, error: 'Your Crate sign-in expired. Sign in again.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }
            via = 'account';

            const owners = (process.env.ADMIN_OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
            if (owners.includes(email) && primaryAdminPassword) {
                role = 'super_admin'; jobTitle = 'Chief Architect'; sub = 'env:super_admin';
            } else {
                const staffSnap = await db.collection('collaborator_access').where('email', '==', email).limit(1).get();
                const staff = staffSnap.docs[0];
                if (staff && staff.data().status !== 'revoked') {
                    role = `collaborator:${staff.id}`;
                    jobTitle = staff.data().jobTitle || 'Collaborator';
                    sub = `collab:${staff.id}`;
                    displayName = staff.data().name || displayName;
                }
            }
        }

        // 1. Check Hardcoded Roles
        for (const [key, value] of Object.entries(validPasswords)) {
            if (role) break;
            if (value && password === value) {
                sub = `env:${key}`;
                role = key;
                jobTitle = key === 'super_admin' ? 'Chief Architect' : key === 'master' ? 'Strategic Advisor' : 'Festival Lead';
                break;
            }
        }
        
        // 2. Check Restricted Payout Keys (PAY-XXXX)
        if (!role && !idToken && password.startsWith('PAY-')) {
            const keySnap = await db.collection('director_payout_keys')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            
            if (!keySnap.empty) {
                const doc = keySnap.docs[0];
                const data = doc.data();
                role = 'director_payout';
                sub = `pay:${doc.id}`;
                targetDirector = data.directorName;
                payoutType = data.payoutMethod || 'filmmaker';
                jobTitle = `${payoutType.toUpperCase()} Payout Terminal`;
            }
        }

        // 3. Check Dynamic Collaborator Keys
        if (!role && !idToken) {
            const collabSnap = await db.collection('collaborator_access')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            
            if (!collabSnap.empty) {
                const doc = collabSnap.docs[0];
                const data = doc.data();
                if (data.status !== 'revoked') {
                    role = `collaborator:${doc.id}`;
                    sub = `collab:${doc.id}`;
                    jobTitle = data.jobTitle || 'Collaborator';
                    displayName = displayName || data.name || '';
                }
            }
        }

        if (role) {
            // Log successful login to audit trail
            await db.collection('audit_logs').add({
                role: `${role.toUpperCase()}: ${displayName || targetDirector || 'Unknown'}`,
                action: 'NODE_AUTH_SUCCESS',
                type: 'LOGIN',
                details: `Signed in: ${displayName || targetDirector} via ${via === 'account' ? 'Crate account' : 'access key'} from IP ${ip || 'Unknown'}.`,
                timestamp: FieldValue.serverTimestamp(),
                ip
            });

            const operatorName = displayName || targetDirector || 'ADMIN';
            // Staff sign-ins get a fresh single-active-session nonce — this
            // sign-in immediately supersedes (kicks) any pass issued to the
            // same collaborator on another device. See adminSession.ts.
            let nonce: string | undefined;
            if (sub.startsWith('collab:')) {
                nonce = newSessionNonce();
                await db.collection('collaborator_access').doc(sub.slice('collab:'.length)).set({ sessionNonce: nonce }, { merge: true });
            }
            const sessionToken = signAdminSession({ sub, role, name: operatorName, via, nonce });

            return new Response(JSON.stringify({ 
                success: true, 
                role, 
                jobTitle,
                targetDirector, 
                payoutType,
                operatorName,
                // The browser stores THIS, never the password. See adminSession.ts.
                sessionToken,
                expiresAt: Date.now() + SESSION_TTL_MS,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            // Failed attempts were previously invisible — only successes got
            // logged, so there was no way to notice a brute-force attempt
            // even after the fact. Best-effort: never let a logging failure
            // block the actual auth response.
            db.collection('audit_logs').add({
                role: 'UNKNOWN',
                action: 'NODE_AUTH_FAILURE',
                type: 'SECURITY',
                details: `Failed login attempt from IP: ${ip || 'Unknown'}.`,
                timestamp: FieldValue.serverTimestamp(),
                ip
            }).catch(() => {});

            return new Response(JSON.stringify({ success: false, error: 'Invalid access key' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        logServerError('api/admin-login', error);
        return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}