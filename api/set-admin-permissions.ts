
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password, role, allowedTabs } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        // Super/Master check
        if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB offline");

        await db.collection('admin_permissions').doc(role).set({ allowedTabs });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
