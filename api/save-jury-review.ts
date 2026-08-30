// api/save-jury-review.ts
// Admin-only write to jury_reviews/{filmId} — the internal admin verdict
// recorded from JuryRoomTab. See get-jury-dashboard-data.ts for why this
// has to be server-side rather than a client Firestore write.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, filmId, filmTitle, vote } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if (password && (password === primaryAdminPassword || password === masterPassword)) {
            isAuthenticated = true;
        } else if (password) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!filmId || !vote) {
            return new Response(JSON.stringify({ error: 'filmId and vote are required' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        await db.collection('jury_reviews').doc(filmId).set({
            ...vote,
            filmTitle: filmTitle || '',
            lastUpdated: new Date(),
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('[save-jury-review] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
