
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password, action, data } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        // Security: Only Super Admin / Master can manage collaborators
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const cleanEmail = (v: unknown) => String(v || '').trim().toLowerCase();
        const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        const emailTaken = async (e: string, exceptId?: string) => {
            const snap = await db.collection('collaborator_access').where('email', '==', e).get();
            return snap.docs.some(d => d.id !== exceptId);
        };

        if (action === 'create') {
            // Cryptographically random key (was Math.random, 6 chars).
            const accessKey = `CRATE-${randomBytes(6).toString('hex').toUpperCase()}`;
            const email = cleanEmail(data?.email);
            if (email && !validEmail(email)) {
                return new Response(JSON.stringify({ error: 'That email address looks wrong.' }), { status: 400 });
            }
            if (email && await emailTaken(email)) {
                return new Response(JSON.stringify({ error: 'Another staff member already uses that email.' }), { status: 409 });
            }
            const docRef = await db.collection('collaborator_access').add({
                name: data.name,
                // Staff with an email here can sign into /admin with their own
                // Crate account — no shared key needed. See admin-login.ts.
                email,
                jobTitle: data.jobTitle || 'Standard Personnel',
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

        if (action === 'set_email') {
            const email = cleanEmail(data?.email);
            if (email && !validEmail(email)) {
                return new Response(JSON.stringify({ error: 'That email address looks wrong.' }), { status: 400 });
            }
            if (email && await emailTaken(email, data.id)) {
                return new Response(JSON.stringify({ error: 'Another staff member already uses that email.' }), { status: 409 });
            }
            await db.collection('collaborator_access').doc(data.id).update({ email });
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'update_perms') {
            await db.collection('collaborator_access').doc(data.id).update({
                assignedTabs: data.assignedTabs,
                jobTitle: data.jobTitle || 'Standard Personnel'
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
