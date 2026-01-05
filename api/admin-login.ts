
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
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
        let collaboratorData = null;

        // 1. Check Hardcoded Roles
        for (const [key, value] of Object.entries(validPasswords)) {
            if (value && password === value) {
                role = key;
                break;
            }
        }
        
        // 2. Check Dynamic Collaborator Keys (Individual Management)
        if (!role) {
            const collabSnap = await db.collection('collaborator_access')
                .where('accessKey', '==', password.trim())
                .limit(1)
                .get();
            
            if (!collabSnap.empty) {
                const doc = collabSnap.docs[0];
                collaboratorData = doc.data();
                role = `collaborator:${doc.id}`;
            }
        }

        // 3. Check Env Vars for legacy passwords
        if (!role) {
             for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    role = key.replace('ADMIN_PASSWORD_', '').toLowerCase();
                    break;
                }
            }
        }

        if (role) {
            // Log successful login to audit trail
            await db.collection('audit_logs').add({
                role: `${role.toUpperCase()}: ${name || 'Unknown'}`,
                action: 'NODE_AUTH_SUCCESS',
                type: 'LOGIN',
                details: `Successful uplink from ${name || 'anonymous operator'} at IP: ${ip || 'Unknown'}`,
                timestamp: FieldValue.serverTimestamp(),
                ip
            });

            return new Response(JSON.stringify({ success: true, role }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
             // Log failed attempt
            await db.collection('security_events').add({
                type: 'FAILED_ADMIN_LOGIN',
                ip,
                timestamp: FieldValue.serverTimestamp(),
                details: { userAgent: request.headers.get('user-agent'), attemptedName: name }
            });
            return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
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
