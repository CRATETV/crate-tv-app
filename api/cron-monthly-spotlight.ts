// api/cron-monthly-spotlight.ts
// Vercel Cron Job — runs every Monday at 9am ET
// Only sends on the FIRST Monday of the month
// Configure in vercel.json: { "crons": [{ "path": "/api/cron-monthly-spotlight", "schedule": "0 14 * * 1" }] }

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { buildSpotlightEmail, loadSpotlightMovie } from './_lib/spotlightEmail.js';

export async function GET(request: Request) {
    // Verify it's actually the first Monday of the month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dayOfWeek  = now.getDay(); // 0=Sun, 1=Mon

    // First Monday = day is Mon AND date is 1–7
    if (dayOfWeek !== 1 || dayOfMonth > 7) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Not first Monday of month' }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

    // Verify cron secret so only Vercel can trigger this
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    // FIX: this used to only check the header when CRON_SECRET was set,
    // which meant a missing/unconfigured env var made the endpoint wide
    // open to anyone on the internet instead of blocking it. Fail closed.
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) {
        console.error('Firebase init error:', initError);
        return new Response(JSON.stringify({ error: initError }), { status: 500 });
    }

    const db = getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 500 });

    // Read spotlight config set by admin
    const spotlightDoc = await db.collection('settings').doc('monthly_spotlight').get();
    if (!spotlightDoc.exists) {
        console.warn('No monthly spotlight configured — skipping');
        return new Response(JSON.stringify({ skipped: true, reason: 'No spotlight configured' }), { status: 200 });
    }

    const { movieKey, sentAt } = spotlightDoc.data()!;

    // Don't send twice in same month
    if (sentAt) {
        const sent = sentAt.toDate ? sentAt.toDate() : new Date(sentAt);
        if (sent.getMonth() === now.getMonth() && sent.getFullYear() === now.getFullYear()) {
            return new Response(JSON.stringify({ skipped: true, reason: 'Already sent this month' }), { status: 200 });
        }
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ skipped: true, reason: 'No movie key set' }), { status: 200 });
    }

    // Fetch the movie
    const movie = await loadSpotlightMovie(db, movieKey);
    if (!movie) {
        return new Response(JSON.stringify({ error: `Movie ${movieKey} not found` }), { status: 404 });
    }

    // Collect all subscribers from both collections
    const [subSnap, zineSnap] = await Promise.all([
        db.collection('subscriptions').get(),
        db.collection('zine_subscriptions').get(),
    ]);
    const emailSet = new Set<string>();
    // Skip account holders who've unsubscribed (optedOut: true) — see
    // api/unsubscribe-newsletter.ts. Everything written before that existed
    // has no optedOut field and still counts as subscribed.
    subSnap.docs.forEach(d => { if (d.data().optedOut !== true) emailSet.add(d.id); });
    // Skip zine subscribers who've unsubscribed (status: 'cancelled') —
    // this link used to point at the homepage with no real opt-out behind
    // it, so cancelled is a brand-new status; everything written before it
    // existed has no status field and still counts as subscribed.
    zineSnap.docs.forEach(d => { if (d.data().status !== 'cancelled') emailSet.add(d.id); });
    const emails = Array.from(emailSet).filter(e => e.includes('@'));

    if (emails.length === 0) {
        return new Response(JSON.stringify({ skipped: true, reason: 'No subscribers' }), { status: 200 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { subject, html } = buildSpotlightEmail(movieKey, movie, now);

    // Send in batches of 40 (Resend limit)
    const BATCH = 40;
    let sent = 0;
    for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH);
        await resend.emails.send({
            from: 'CrateTV <studio@cratetv.net>',
            to: 'delivered@resend.dev',
            bcc: batch,
            subject,
            html,
        });
        sent += batch.length;
    }

    // Mark as sent
    await db.collection('settings').doc('monthly_spotlight').update({
        sentAt: new Date(),
        lastSentTo: sent,
    });

    console.log(`✅ Monthly spotlight sent: "${movie.title}" to ${sent} subscribers`);
    return new Response(JSON.stringify({ success: true, movie: movie.title, sentTo: sent }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
    });
}
