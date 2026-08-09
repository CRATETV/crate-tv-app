// api/get-festival-report.ts
//
// Server-side counterpart to FestivalReportTab.tsx's data needs.
// festival_tickets and festival_viewers are both correctly locked down
// from direct client reads in firestore.rules (a regular signed-in user
// can only ever read their OWN ticket, and festival_viewers is admin-only
// entirely) — which is the right security posture, but nobody had wired
// up the admin-side bypass this specific tab needs. The tab was silently
// getting a permission-denied error on every load, swallowed by a bare
// .catch(), which is why it always showed 0 tickets / $0.00 revenue even
// though the underlying data was completely intact. This endpoint uses
// the Admin SDK to read both collections in full, gated on the same
// admin password check used everywhere else in the admin panel.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        const festPassword = process.env.FESTIVAL_ADMIN_PASSWORD;
        if (!password || (password !== primaryAdminPassword && password !== masterPassword && password !== festPassword)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        const [ticketSnap, viewerSnap] = await Promise.all([
            db.collection('festival_tickets').orderBy('purchasedAt', 'desc').get(),
            db.collection('festival_viewers').orderBy('firstJoinedAt', 'desc').get(),
        ]);

        const tickets = ticketSnap.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, purchasedAt: data.purchasedAt?.toDate?.().toISOString() || null };
        });
        const viewers = viewerSnap.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, firstJoinedAt: data.firstJoinedAt?.toDate?.().toISOString() || null };
        });

        return new Response(JSON.stringify({ tickets, viewers }), { status: 200 });
    } catch (error) {
        console.error('[get-festival-report] Failed:', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), { status: 500 });
    }
}
