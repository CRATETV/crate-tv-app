
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB offline");

        const snapshot = await db.collection('admin_permissions').get();
        const permissions: Record<string, string[]> = {};
        snapshot.forEach(doc => {
            permissions[doc.id] = doc.data().allowedTabs || [];
        });

        return new Response(JSON.stringify({ permissions }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
