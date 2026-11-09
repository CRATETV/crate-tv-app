// api/set-monthly-spotlight.ts
// Admin sets which film is featured next month

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveAdminCredential } from './_lib/adminSession.js';
import { Resend } from 'resend';
import { buildSpotlightEmail, loadSpotlightMovie } from './_lib/spotlightEmail.js';

export async function POST(request: Request) {
    try {
        const { password: __raw_password, movieKey, action, to } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        const primary = process.env.ADMIN_PASSWORD;
        const master  = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primary && password !== master) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB unavailable');

        // Preview: send the email to ONE address (the admin's own) so they can see it. Never to subscribers.
        if (action === 'preview') {
            const email = String(to || '').trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return new Response(JSON.stringify({ error: 'Type your own email address to get the preview.' }), { status: 400 });
            }
            const doc = await db.collection('settings').doc('monthly_spotlight').get();
            const key = (typeof movieKey === 'string' && movieKey) || doc.data()?.movieKey;
            if (!key) return new Response(JSON.stringify({ error: 'Pick a film first.' }), { status: 400 });
            const film = await loadSpotlightMovie(db, key);
            if (!film) return new Response(JSON.stringify({ error: 'That film was not found.' }), { status: 404 });
            const { subject, html } = buildSpotlightEmail(key, film, new Date());
            await new Resend(process.env.RESEND_API_KEY).emails.send({
                from: 'CrateTV <studio@cratetv.net>',
                to: email,
                subject: `[PREVIEW] ${subject}`,
                html,
            });
            return new Response(JSON.stringify({ success: true, sentTo: email }), { status: 200 });
        }

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
