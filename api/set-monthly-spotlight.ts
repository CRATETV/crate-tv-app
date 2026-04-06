// api/set-monthly-spotlight.ts
// Admin sets which film is featured next month

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, movieKey } = await request.json();

        const primary = process.env.ADMIN_PASSWORD;
        const master  = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primary && password !== master) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB unavailable');

        await db.collection('settings').doc('monthly_spotlight').set({
            movieKey,
            setAt: new Date(),
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB unavailable');

        const doc = await db.collection('settings').doc('monthly_spotlight').get();
        return new Response(JSON.stringify(doc.exists ? doc.data() : {}), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
    }
}
