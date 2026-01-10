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

        // 1. Fetch Auth data - Increase limit for cluster visibility
        const listUsersResult = await auth.listUsers(1000);
        
        // 2. Fetch all Firestore Profiles for merging
        const profilesSnapshot = await db.collection('users').get();
        const profileMap = new Map();
        profilesSnapshot.forEach(doc => profileMap.set(doc.id, doc.data()));

        // 3. Assemble UserRecords using Auth as the primary source
        // This ensures that even users who haven't had their Firestore doc created yet (rare) show up.
        const users: UserRecord[] = listUsersResult.users.map(u => {
            const profile = profileMap.get(u.uid) || {};
            return {
                uid: u.uid,
                email: u.email || 'anonymous@node.local',
                name: profile.name || u.displayName || u.email?.split('@')[0] || 'Patron',
                isActor: profile.isActor === true,
                isFilmmaker: profile.isFilmmaker === true,
                isIndustryPro: profile.isIndustryPro === true,
                watchlist: profile.watchlist || [],
                watchedMovies: profile.watchedMovies || [],
                likedMovies: profile.likedMovies || [],
                lastSignIn: u.metadata.lastSignInTime,
                joinDate: u.metadata.creationTime
            } as UserRecord;
        });

        // 4. Sort by activity density (most engaged first)
        users.sort((a, b) => {
            const bEng = (b.watchedMovies?.length || 0) + (b.likedMovies?.length || 0);
            const aEng = (a.watchedMovies?.length || 0) + (a.likedMovies?.length || 0);
            return bEng - aEng;
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