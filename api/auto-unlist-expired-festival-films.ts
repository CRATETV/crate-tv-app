// api/auto-unlist-expired-festival-films.ts
//
// Runs on a schedule (see vercel.json) once a festival block has been off
// the public festival page for a week — PwffPage.tsx already hides expired
// blocks from /pwff-philly2026 itself (client-side filter), but nothing
// updated the underlying data once that happened. This closes that gap,
// and does it generically against whatever festival is currently in
// festival/schedule/days — so it applies to future festivals automatically,
// not just the current one. Two different things happen depending on the
// film:
//
// - Ordinary festival films: unlisted from the regular catalog
//   (movies/{key}.isUnlisted = true) once their block expires, so they
//   stop showing up in Library/homepage/search indefinitely.
//
// - Films marked movies/{key}.keepInCatalogAfterFestival === true (e.g.
//   LUNA): meant to KEEP showing, as a normal standalone catalog title,
//   once their block expires — so instead of unlisting, this detaches them
//   from the block itself (removes the key from that block's movieKeys).
//   That matters beyond just the festival page: MoviePage.tsx's access
//   gating treats any movie still linked to a block as block-gated
//   regardless of its own isForSale/salePrice fields, so a film meant to
//   go on individual sale after the festival needs to actually be detached
//   — not just left in place — for that sale to take effect. Doing this
//   detachment by hand ahead of the real 7-day mark (rather than letting
//   this cron do it) pulls the film out of the festival lineup early,
//   which is exactly the mistake to avoid.
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
        // dayId -> that day's blocks, with expired-block flag per block
        const dayBlocks = new Map<string, { blocks: FilmBlock[]; expired: boolean[] }>();
        const expiredMovieKeys = new Set<string>();

        daysSnap.forEach(doc => {
            const blocks: FilmBlock[] = doc.data().blocks || [];
            const expired = blocks.map(block => {
                const referenceTime = block.festivalEndTime || block.screeningStartTime;
                if (!referenceTime) return false;
                const refMs = new Date(referenceTime).getTime();
                if (isNaN(refMs)) return false;
                const isExpired = now - refMs > FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS;
                if (isExpired) for (const key of block.movieKeys || []) expiredMovieKeys.add(key);
                return isExpired;
            });
            dayBlocks.set(doc.id, { blocks, expired });
        });

        if (expiredMovieKeys.size === 0) {
            return new Response(JSON.stringify({ success: true, unlisted: [], detached: [], message: 'No expired blocks found.' }), { status: 200 });
        }

        const movieDocs = await Promise.all(
            Array.from(expiredMovieKeys).map(key => db.collection('movies').doc(key).get())
        );
        const movieByKey = new Map<string, Movie>();
        movieDocs.forEach(doc => { if (doc.exists) movieByKey.set(doc.id, doc.data() as Movie); });

        const batch = db.batch();
        const unlisted: string[] = [];
        const detachedKeys = new Set<string>();

        movieByKey.forEach((movie, key) => {
            if (movie.keepInCatalogAfterFestival) {
                detachedKeys.add(key); // handled via block rewrite below
                return;
            }
            if (movie.isUnlisted) return; // already done, nothing to write
            batch.set(db.collection('movies').doc(key), { isUnlisted: true }, { merge: true });
            unlisted.push(movie.title || key);
        });

        const detached: string[] = [];
        for (const [dayId, { blocks, expired }] of dayBlocks) {
            let changed = false;
            const newBlocks = blocks.map((block, i) => {
                if (!expired[i]) return block;
                const keysToRemove = (block.movieKeys || []).filter(k => detachedKeys.has(k));
                if (keysToRemove.length === 0) return block;
                changed = true;
                for (const k of keysToRemove) detached.push(movieByKey.get(k)?.title || k);
                return { ...block, movieKeys: (block.movieKeys || []).filter(k => !detachedKeys.has(k)) };
            });
            if (changed) {
                batch.set(db.collection('festival').doc('schedule').collection('days').doc(dayId), { blocks: newBlocks }, { merge: true });
            }
        }

        if (unlisted.length === 0 && detached.length === 0) {
            return new Response(JSON.stringify({ success: true, unlisted: [], detached: [], message: 'All expired films already handled.' }), { status: 200 });
        }

        await batch.commit();
        await assembleAndSyncMasterData(db);

        return new Response(JSON.stringify({ success: true, unlisted, detached }), { status: 200 });

    } catch (error) {
        console.error('[auto-unlist-expired-festival-films] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
