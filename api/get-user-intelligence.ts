
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { UserRecord } from '../types.js';

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
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error("Infrastructure Offline");

        const usersSnapshot = await db.collection('users').get();
        const users: UserRecord[] = [];
        
        // Fetch Auth data for lastSignInTime
        const listAllUsers = async (nextPageToken?: string): Promise<any[]> => {
            const result = await auth.listUsers(1000, nextPageToken);
            let combined = result.users;
            if (result.pageToken) {
                const next = await listAllUsers(result.pageToken);
                combined = [...combined, ...next];
            }
            return combined;
        };

        const authUsers = await listAllUsers();
        const authMap = new Map(authUsers.map(u => [u.uid, u.metadata.lastSignInTime]));

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({ 
                uid: doc.id, 
                ...data,
                lastSignIn: authMap.get(doc.id) || null
            } as UserRecord);
        });

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
