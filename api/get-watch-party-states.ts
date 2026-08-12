// api/get-watch-party-states.ts
//
// Server-side counterpart to WatchPartyManager.tsx's live status needs.
// The client-side listener on watch_parties requires isSignedIn() per
// firestore.rules — which is correct for regular viewers (who do need a
// real account to watch), but admin access works through a completely
// separate password check, not Firebase Auth sign-in. If an admin's
// session ever wasn't ALSO signed into a regular account at the same
// moment, this listener would silently fail with a permission error —
// meaning the dashboard could show "Waiting for Host" forever on a
// party that was genuinely, verifiably live, with no Start or End
// button ever appearing, while the underlying data was completely
// fine the whole time. This endpoint uses the Admin SDK (no personal
// sign-in required at all), gated on the same admin password check
// used everywhere else in the admin panel.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const festPassword = process.env.FESTIVAL_ADMIN_PASSWORD;
        let isAuthenticated = !!password && (password === primaryAdminPassword || password === masterPassword || password === festPassword);

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        // Collaborators can also manage watch parties — check their access
        // key too, same as start-watch-party.ts already does.
        if (!isAuthenticated) {
            const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
            if (!collabSnap.empty) isAuthenticated = true;
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const snap = await db.collection('watch_parties').get();
        const states: Record<string, any> = {};
        snap.forEach(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to ISO strings — they don't
            // survive JSON.stringify cleanly otherwise.
            const clean: Record<string, any> = {};
            for (const [key, value] of Object.entries(data)) {
                clean[key] = value && typeof value === 'object' && 'toDate' in (value as any)
                    ? (value as any).toDate().toISOString()
                    : value;
            }
            states[doc.id] = clean;
        });

        return new Response(JSON.stringify({ states }), { status: 200 });
    } catch (error) {
        console.error('[get-watch-party-states] Failed:', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), { status: 500 });
    }
}
