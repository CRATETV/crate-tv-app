
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getRoleFromPassword = (password: string | null) => {
    if (!password) return 'unknown';
    if (password === process.env.ADMIN_PASSWORD) return 'super_admin';
    if (password === process.env.ADMIN_MASTER_PASSWORD) return 'master';
    if (password === process.env.COLLABORATOR_PASSWORD) return 'collaborator';
    if (password === process.env.FESTIVAL_ADMIN_PASSWORD) return 'festival_admin';
    for (const key in process.env) {
        if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
            return key.replace('ADMIN_PASSWORD_', '').toLowerCase();
        }
    }
    return 'delegated_node';
};

export async function POST(request: Request) {
    try {
        const { password, operatorName, action, type, details } = await request.json();
        const baseRole = getRoleFromPassword(password);

        if (baseRole === 'unknown') {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const ipHeader = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         '0.0.0.0';
        const ip = ipHeader.split(',')[0].trim();

        await db.collection('audit_logs').add({
            role: `${baseRole.toUpperCase()}: ${operatorName || 'Unknown'}`,
            action: action || 'ADMIN_ACTION',
            type: type || 'MUTATION',
            details: details || 'No details provided.',
            timestamp: FieldValue.serverTimestamp(),
            ipAddress: ip
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
