
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
    const ip = getIp(request);
    try {
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
        let jobTitle = '';

        // 1. Check Hardcoded Roles
        for (const [key, value] of Object.entries(validPasswords)) {
            if (value && password === value) {
                role = key;
                jobTitle = key === 'super_admin' ? 'Chief Architect' : key === 'master' ? 'Strategic Advisor' : 'Festival Lead';
                break;
            }
        }
        
        // 2. Check Director Payout Keys (PAY-XXXX)
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
                jobTitle = 'Filmmaker Payout Terminal';
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
                details: `Successful uplink from ${name || targetDirector} at IP: ${ip || 'Unknown'}`,
                timestamp: FieldValue.serverTimestamp(),
                ip
            });

            return new Response(JSON.stringify({ 
                success: true, 
                role, 
                jobTitle,
                targetDirector // Only populated for filmmaker payout logins
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Invalid access key' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
