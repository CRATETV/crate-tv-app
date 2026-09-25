import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isValidAdminKey } from './_lib/adminAuth.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password } = await request.json();
        const password = await resolveAdminCredential(__raw_password);
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB connection failed");

        if (!(await isValidAdminKey(password, db))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const snapshot = await db.collection('actorSubmissions').orderBy('submissionDate', 'desc').get();
        const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return new Response(JSON.stringify({ submissions }), { status: 200 });
    } catch (error) {
        console.error("Fetch actor submissions error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}