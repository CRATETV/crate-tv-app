// api/auto-unlist-expired-festival-films.ts
//
// Runs on a schedule (see vercel.json) and unlists films from the catalog
// once their festival block has been off the public festival page for a
// week — PwffPage.tsx already hides expired blocks from /pwff-philly2026
// itself (client-side filter), but nothing was removing those films from
// the regular catalog (Library, homepage, search) once that happened, so
// they kept showing up indefinitely after their week was up. This closes
// that gap, and does it generically against whatever festival is
// currently in festival/schedule/days — so it applies to future festivals
// automatically, not just the current one.
//
// A film can opt permanently out of this via
// movies/{key}.keepInCatalogAfterFestival === true (e.g. LUNA).
//
// Configure in vercel.json:
//   { "path": "/api/auto-unlist-expired-festival-films", "schedule": "0 */6 * * *" }
// (every 6 hours — the window is 7 days, so this doesn't need to be
// frequent; a few hours of lag past the exact mark is harmless.)

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { assembleAndSyncMasterData } from './publish-data.js';
import { FilmBlock, Movie, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB unavailable');

        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();

        const now = Date.now();
        const expiredMovieKeys = new Set<string>();

        daysSnap.forEach(doc => {
            const blocks: FilmBlock[] = doc.data().blocks || [];
            for (const block of blocks) {
                const referenceTime = block.festivalEndTime || block.screeningStartTime;
                if (!referenceTime) continue;
                const refMs = new Date(referenceTime).getTime();
                if (isNaN(refMs)) continue;
                if (now - refMs > FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS) {
                    for (const key of block.movieKeys || []) expiredMovieKeys.add(key);
                }
            }
        });

        if (expiredMovieKeys.size === 0) {
            return new Response(JSON.stringify({ success: true, unlisted: [], message: 'No expired blocks found.' }), { status: 200 });
        }

        const movieDocs = await Promise.all(
            Array.from(expiredMovieKeys).map(key => db.collection('movies').doc(key).get())
        );

        const batch = db.batch();
        const unlisted: string[] = [];
        movieDocs.forEach(doc => {
            if (!doc.exists) return;
            const movie = doc.data() as Movie;
            if (movie.isUnlisted) return; // already done, nothing to write
            if (movie.keepInCatalogAfterFestival) return; // exempt, e.g. LUNA
            batch.set(doc.ref, { isUnlisted: true }, { merge: true });
            unlisted.push(movie.title || doc.id);
        });

        if (unlisted.length === 0) {
            return new Response(JSON.stringify({ success: true, unlisted: [], message: 'All expired films already unlisted or exempt.' }), { status: 200 });
        }

        await batch.commit();
        await assembleAndSyncMasterData(db);

        return new Response(JSON.stringify({ success: true, unlisted }), { status: 200 });

    } catch (error) {
        console.error('[auto-unlist-expired-festival-films] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
