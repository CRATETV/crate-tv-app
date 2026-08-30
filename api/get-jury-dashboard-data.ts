// api/get-jury-dashboard-data.ts
// Admin-only read of jury_reviews + guest_judging for JuryRoomTab and
// AcademyIntelTab. Neither collection has (or should have) a client
// Firestore rule that lets an unfiltered admin-style read happen safely —
// there's no Firebase-Auth-based "admin" role in this app (admin access is
// a plain password check), so the only way to secure this aggregate view
// is server-side via the Admin SDK, same pattern as the rest of the admin
// dashboard's financial/analytics tabs.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { JuryVerdict } from '../types.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

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

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        const [juryReviewsSnap, guestJudgingSnap] = await Promise.all([
            db.collection('jury_reviews').get(),
            db.collection('guest_judging').get(),
        ]);

        const juryReviews: Record<string, any> = {};
        juryReviewsSnap.forEach(doc => { juryReviews[doc.id] = doc.data(); });

        const guestJudging: Record<string, JuryVerdict[]> = {};
        guestJudgingSnap.forEach(doc => {
            const data = doc.data() as JuryVerdict & { filmId: string };
            if (!guestJudging[data.filmId]) guestJudging[data.filmId] = [];
            guestJudging[data.filmId].push(data);
        });

        return new Response(JSON.stringify({ juryReviews, guestJudging }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[get-jury-dashboard-data] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
