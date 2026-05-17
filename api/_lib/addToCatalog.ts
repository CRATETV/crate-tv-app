// api/_lib/addToCatalog.ts
// Writes a pipeline entry to the `movies` Firestore collection,
// then directly calls assembleAndSyncMasterData to push to S3 immediately.

import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { assembleAndSyncMasterData } from '../publish-data.js';

function generateMovieKey(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 60);
}

export async function addPipelineEntryToCatalog(
    db: Firestore,
    data: Record<string, any>,
    submissionId: string,
    isForSale: boolean = false
): Promise<{ movieKey: string }> {

    const rawKey = generateMovieKey(data.title || 'untitled');
    const movieKey = `${rawKey}-${submissionId.slice(-6)}`;

    const movieDoc: Record<string, any> = {
        key:           movieKey,
        title:         data.title      || 'Untitled',
        synopsis:      data.synopsis   || '',
        director:      data.director   || '',
        cast:          [],
        trailer:       '',
        fullMovie:     data.filmUrl    || data.fullMovie  || data.movieUrl || '',
        rokuStreamUrl: data.filmUrl    || data.fullMovie  || data.movieUrl || '',
        poster:        data.posterUrl  || data.poster     || '',
        tvPoster:      data.posterUrl  || data.poster     || '',
        genres:        data.genre      || '',
        runtime:       data.runtime    || '',
        likes:         0,
        isForSale:     isForSale,
        salePrice:     isForSale ? 4.99 : 0,
        source:        'filmmaker-submission',
        submissionId:  submissionId,
        publishedAt:   new Date().toISOString(),
        createdAt:     FieldValue.serverTimestamp(),
    };

    // 1. Write to movies collection
    await db.collection('movies').doc(movieKey).set(movieDoc);
    console.log(`[addToCatalog] "${data.title}" written to Firestore as "${movieKey}"`);

    // 2. Sync directly to S3 — no HTTP call, no URL guessing
    try {
        await assembleAndSyncMasterData(db);
        console.log(`[addToCatalog] S3 sync complete for "${movieKey}"`);
    } catch (syncErr) {
        console.error('[addToCatalog] S3 sync failed (movie is in Firestore, hit Publish in admin to sync):', syncErr);
    }

    return { movieKey };
}
