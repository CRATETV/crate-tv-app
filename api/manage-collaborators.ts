
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    try {
        const { password, action, data } = await request.json();

        // Security: Only Super Admin / Master can manage collaborators
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        if (action === 'create') {
            const accessKey = `CRATE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const docRef = await db.collection('collaborator_access').add({
                name: data.name,
                accessKey,
                assignedTabs: [],
                status: 'active',
                createdAt: FieldValue.serverTimestamp()
            });
            return new Response(JSON.stringify({ success: true, id: docRef.id, accessKey }), { status: 200 });
        }

        if (action === 'delete') {
            await db.collection('collaborator_access').doc(data.id).delete();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'update_perms') {
            await db.collection('collaborator_access').doc(data.id).update({
                assignedTabs: data.assignedTabs
            });
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'list') {
            const snap = await db.collection('collaborator_access').orderBy('createdAt', 'desc').get();
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return new Response(JSON.stringify({ collaborators: list }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
