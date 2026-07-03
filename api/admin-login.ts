import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { logServerError } from './_lib/logError.js';

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

        const { password, name } = await request.json();

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

        // 1. Check Hardcoded Roles
        for (const [key, value] of Object.entries(validPasswords)) {
            if (value && password === value) {
                role = key;
                jobTitle = key === 'super_admin' ? 'Chief Architect' : key === 'master' ? 'Strategic Advisor' : 'Festival Lead';
                break;
            }
        }
        
        // 2. Check Restricted Payout Keys (PAY-XXXX)
        if (!role && password.startsWith('PAY-')) {
            const keySnap = await db.collection('director_payout_keys')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            
            if (!keySnap.empty) {
                const doc = keySnap.docs[0];
                const data = doc.data();
                role = 'director_payout';
                targetDirector = data.directorName;
                payoutType = data.payoutMethod || 'filmmaker';
                jobTitle = `${payoutType.toUpperCase()} Payout Terminal`;
            }
        }

        // 3. Check Dynamic Collaborator Keys
        if (!role) {
            const collabSnap = await db.collection('collaborator_access')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            
            if (!collabSnap.empty) {
                const doc = collabSnap.docs[0];
                const data = doc.data();
                role = `collaborator:${doc.id}`;
                jobTitle = data.jobTitle || 'Collaborator';
            }
        }

        if (role) {
            // Log successful login to audit trail
            await db.collection('audit_logs').add({
                role: `${role.toUpperCase()}: ${name || targetDirector || 'Unknown'}`,
                action: 'NODE_AUTH_SUCCESS',
                type: 'LOGIN',
                details: `Successful uplink from ${name || targetDirector} at IP: ${ip || 'Unknown'}. Node Type: ${payoutType || 'Standard'}`,
                timestamp: FieldValue.serverTimestamp(),
                ip
            });

            return new Response(JSON.stringify({ 
                success: true, 
                role, 
                jobTitle,
                targetDirector, 
                payoutType
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