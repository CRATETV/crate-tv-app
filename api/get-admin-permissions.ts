
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB offline");

        // 1. Fetch Global Roles
        const snapshot = await db.collection('admin_permissions').get();
        const permissions: Record<string, string[]> = {};
        snapshot.forEach(doc => {
            permissions[doc.id] = doc.data().allowedTabs || [];
        });

        // 2. If current user is a collaborator, inject their specific permissions
        if (password && !password.includes(process.env.ADMIN_PASSWORD || '')) {
            const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
            if (!collabSnap.empty) {
                const doc = collabSnap.docs[0];
                permissions[`collaborator:${doc.id}`] = doc.data().assignedTabs || [];
            }
        }

        return new Response(JSON.stringify({ permissions }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
