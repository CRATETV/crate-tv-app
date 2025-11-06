import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to get IP address from request headers
const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    // Vercel specific IP header
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
    const ip = getIp(request);
    try {
        const { password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const collaboratorPassword = process.env.COLLABORATOR_PASSWORD;
        const festivalAdminPassword = process.env.FESTIVAL_ADMIN_PASSWORD;

        const validPasswords: Record<string, string | undefined> = {
            super_admin: primaryAdminPassword,
            master: masterPassword,
            collaborator: collaboratorPassword,
            festival_admin: festivalAdminPassword,
        };

        let role = '';
        for (const [key, value] of Object.entries(validPasswords)) {
            if (value && password === value) {
                role = key;
                break;
            }
        }
        
        if (!role) {
             for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    role = key.replace('ADMIN_PASSWORD_', '').toLowerCase();
                    break;
                }
            }
        }

        if (role) {
            return new Response(JSON.stringify({ success: true, role }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
             // Log failed attempt
            const initError = getInitializationError();
            if (!initError) {
                const db = getAdminDb();
                if (db) {
                    await db.collection('security_events').add({
                        type: 'FAILED_ADMIN_LOGIN',
                        ip,
                        timestamp: FieldValue.serverTimestamp(),
                        details: {
                            userAgent: request.headers.get('user-agent'),
                        }
                    });
                }
            }
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
