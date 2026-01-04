
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { UserRecord } from '../types.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        // 1. Authentication
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB offline");

        // 2. Fetch all users
        const usersSnapshot = await db.collection('users').get();
        const users: UserRecord[] = [];
        
        usersSnapshot.forEach(doc => {
            users.push({ uid: doc.id, ...doc.data() } as UserRecord);
        });

        // 3. Sort by activity (watch count)
        users.sort((a, b) => (b.watchedMovies?.length || 0) - (a.watchedMovies?.length || 0));

        return new Response(JSON.stringify({ users }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("User intel error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
