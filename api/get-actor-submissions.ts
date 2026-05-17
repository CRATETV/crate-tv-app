import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;

        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB connection failed");

        const snapshot = await db.collection('actorSubmissions').orderBy('submissionDate', 'desc').get();
        const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return new Response(JSON.stringify({ submissions }), { status: 200 });
    } catch (error) {
        console.error("Fetch actor submissions error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}