/**
 * schedule-watch-party.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Writes watch party schedule directly to Firestore real-time path.
 * This bypasses S3 entirely so the countdown banner appears INSTANTLY
 * on all connected clients — no manifest republish needed.
 *
 * Called by MovieEditor when admin sets a watchPartyStartTime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAdminDb } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, movieKey, movieTitle, watchPartyStartTime, isWatchPartyEnabled, isWatchPartyPaid, watchPartyPrice, poster } = await request.json();

        if (!password || (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const db = getAdminDb();
        if (!db) throw new Error('Database unavailable');

        if (!isWatchPartyEnabled || !movieKey) {
            // Clear the schedule if disabled
            await db.collection('watch_party_schedule').doc(movieKey || 'unknown').delete().catch(() => {});
            return new Response(JSON.stringify({ success: true, cleared: true }), { status: 200 });
        }

        // Write directly to real-time Firestore — every client sees this instantly
        await db.collection('watch_party_schedule').doc(movieKey).set({
            movieKey,
            movieTitle,
            watchPartyStartTime: watchPartyStartTime || null,
            isWatchPartyPaid: !!isWatchPartyPaid,
            watchPartyPrice: watchPartyPrice || 0,
            poster: poster || '',
            scheduledAt: new Date().toISOString(),
            isWatchPartyEnabled: true,
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[SCHEDULE-WATCH-PARTY]', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
