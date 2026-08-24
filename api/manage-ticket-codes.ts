import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';

// Read/delete counterpart to api/generate-ticket-codes.ts — the admin panel's
// listing and delete actions were still doing direct client Firestore
// getDocs()/deleteDoc() against `ticket_codes`, which has no rule in
// firestore.rules (falls to the deny-all catch-all) same as generation did
// before its fix. This routes both through the Admin SDK instead.

async function isAuthenticated(db: FirebaseFirestore.Firestore, password: string): Promise<boolean> {
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
        return true;
    }
    const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
    return !collabSnap.empty;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const password = url.searchParams.get('password') || '';

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        if (!(await isAuthenticated(db, password))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const snap = await db.collection('ticket_codes').orderBy('createdAt', 'desc').get();
        const codes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return new Response(JSON.stringify({ success: true, codes }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[manage-ticket-codes GET] Error:', error);
        logServerError('api/manage-ticket-codes', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Server error.' }), { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { password, codeId } = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        if (!(await isAuthenticated(db, password))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        if (!codeId) {
            return new Response(JSON.stringify({ error: 'codeId is required.' }), { status: 400 });
        }

        await db.collection('ticket_codes').doc(codeId).delete();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[manage-ticket-codes DELETE] Error:', error);
        logServerError('api/manage-ticket-codes', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Server error.' }), { status: 500 });
    }
}
