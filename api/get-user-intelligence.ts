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

        // 1. Fetch Auth data with 1000 node limit (Safety Cap)
        const listUsersResult = await auth.listUsers(1000);
        
        // Fix: Explicitly type the Map to ensure authData retrieved later has defined properties and is not 'unknown'
        const authMap = new Map<string, { lastSignIn: string | undefined, creationTime: string | undefined }>(
            listUsersResult.users.map(u => [u.uid, {
                lastSignIn: u.metadata.lastSignInTime,
                creationTime: u.metadata.creationTime
            }])
        );

        // 2. Fetch Firestore Profiles
        const usersSnapshot = await db.collection('users').get();
        const users: UserRecord[] = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            // Fix: Retrieve typed data from the Map to prevent 'unknown' property access errors
            const authData = authMap.get(doc.id);
            
            // Resolve composite identity
            users.push({ 
                uid: doc.id, 
                ...data,
                // Fix: Access properties on the now typed authData to resolve the compilation errors
                lastSignIn: authData?.lastSignIn || data.lastSignIn || null,
                joinDate: authData?.creationTime || data.joinDate || null
            } as UserRecord);
        });

        // 3. Sort by total manifest density
        users.sort((a, b) => {
            const bDensity = (b.watchedMovies?.length || 0) + (b.likedMovies?.length || 0);
            const aDensity = (a.watchedMovies?.length || 0) + (a.likedMovies?.length || 0);
            return bDensity - aDensity;
        });

        return new Response(JSON.stringify({ users }), { 
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error("User intel error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}