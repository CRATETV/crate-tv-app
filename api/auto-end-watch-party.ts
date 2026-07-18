
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';

// FEATURE (user request — "a few minutes after the movie ends can we
// automatically end the party? that way it can get ready for the next
// block"): previously the ONLY way a watch party's status ever became
// 'ended' was an admin manually tapping "End Party" (api/terminate-watch-
// party.ts, which requires the admin password) — there was no automatic
// path at all. The client-side "last film in the block just finished"
// case (WatchPartyPage.tsx's BLOCK AUTO-ADVANCE effect) only ever set
// local UI state (showCredits) and never told the server anything, so the
// party would just sit at status:'live' indefinitely once the content was
// actually over, waiting on a human to notice and end it.
//
// This can't reuse terminate-watch-party.ts's endpoint directly — that one
// is deliberately gated behind the admin password, and a viewer's browser
// obviously shouldn't hold that password client-side (anyone could then
// end ANY party on demand). Instead, this is safe for any viewer's client
// to call freely, because it never trusts the caller about anything that
// matters — it independently re-derives, from the party's own
// server-recorded data, whether this genuinely is the last film in the
// block and whether that film has actually finished (its own runtime, not
// a client's local video-ended event, which could be early/late/spoofed)
// plus a grace period. If those checks don't hold, it's a safe no-op.
const AUTO_END_GRACE_MS = 3 * 60 * 1000; // "a few minutes" — adjust here if a different delay is wanted

export async function POST(request: Request) {
    try {
        const { partyId } = await request.json();
        if (!partyId) {
            return new Response(JSON.stringify({ error: 'partyId is required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        const partyRef = db.collection('watch_parties').doc(partyId);
        const partyDoc = await partyRef.get();
        if (!partyDoc.exists) {
            return new Response(JSON.stringify({ success: false, message: 'Party not found.' }), { status: 200 });
        }
        const party = partyDoc.data()!;

        // Already ended — an admin beat this to it, or another viewer's
        // client already made this exact call successfully. This is what
        // makes it safe for every viewer's client to call independently:
        // whichever one lands first wins, everyone else is a harmless no-op.
        if (party.status === 'ended') {
            return new Response(JSON.stringify({ success: true, alreadyEnded: true }), { status: 200 });
        }
        if (party.status !== 'live') {
            return new Response(JSON.stringify({ success: false, message: `Party status is '${party.status}', not live.` }), { status: 200 });
        }

        const startRef = party.filmStartTime || party.actualStartTime;
        if (!startRef || typeof (startRef as any).toDate !== 'function') {
            return new Response(JSON.stringify({ success: false, message: 'No film start time recorded yet.' }), { status: 200 });
        }
        const filmStartMs = (startRef as any).toDate().getTime();

        // Re-derive the block + active film the same way the client does,
        // so this endpoint doesn't have to trust anything the caller says
        // about which film or how long it runs.
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        let blockMovieKeys: string[] | null = null;
        for (const dayDoc of daysSnap.docs) {
            const blocks = (dayDoc.data().blocks || []) as any[];
            const match = blocks.find(b => b.id === partyId);
            if (match) { blockMovieKeys = match.movieKeys || []; break; }
        }

        let activeFilmKey: string;
        let isLastFilm: boolean;
        if (blockMovieKeys && blockMovieKeys.length > 0) {
            const idx = party.activeMovieIndex ?? 0;
            isLastFilm = idx >= blockMovieKeys.length - 1;
            activeFilmKey = blockMovieKeys[Math.min(idx, blockMovieKeys.length - 1)];
        } else {
            // Not a block at all — a standalone single-movie watch party is
            // always "the last (only) film" by definition.
            isLastFilm = true;
            activeFilmKey = partyId;
        }

        if (!isLastFilm) {
            // There's still another film to come — that transition belongs
            // to api/advance-block-film.ts, not this endpoint.
            return new Response(JSON.stringify({ success: false, message: 'Not the last film in the block.' }), { status: 200 });
        }

        const movieDoc = await db.collection('movies').doc(activeFilmKey).get();
        const durationMinutes = movieDoc.data()?.durationInMinutes;
        const durationMs = (typeof durationMinutes === 'number' && durationMinutes > 0)
            ? durationMinutes * 60 * 1000
            // Unknown runtime — assume a generous 3-hour ceiling rather
            // than a duration that could make this never fire at all.
            : 3 * 60 * 60 * 1000;

        const filmShouldHaveEndedAt = filmStartMs + durationMs;
        const readyToAutoEnd = Date.now() >= filmShouldHaveEndedAt + AUTO_END_GRACE_MS;

        if (!readyToAutoEnd) {
            return new Response(JSON.stringify({ success: false, message: 'Grace period has not elapsed yet.' }), { status: 200 });
        }

        // Every check passed — genuinely the last film, genuinely finished
        // (by the server's own clock, not a client's say-so), genuinely
        // past the grace period. Mirrors the core shutdown steps
        // terminate-watch-party.ts performs for an admin-initiated end, so
        // an auto-ended party leaves the system in the identical state a
        // manually-ended one would (backstage key cleared, notification
        // cleared, catalog release honored, festivalEndTime stamped for
        // the 7-day cleanup cron).
        await partyRef.update({
            status: 'ended',
            isPlaying: false,
            actualStartTime: null,
            currentTime: 0,
            lastUpdated: FieldValue.serverTimestamp(),
            backstageKey: null,
            endedAt: FieldValue.serverTimestamp(),
        });

        await db.collection('movies').doc(partyId).update({
            watchPartyStartTime: null,
            isWatchPartyEnabled: false
        }).catch(() => {});

        await db.collection('data').doc('movies').update({
            [`${partyId}.watchPartyStartTime`]: null,
            [`${partyId}.isWatchPartyEnabled`]: false
        }).catch(() => {});

        try {
            for (const dayDoc of daysSnap.docs) {
                const day = dayDoc.data();
                const blocks = day.blocks || [];
                const idx = blocks.findIndex((b: any) => b.id === partyId);
                if (idx >= 0) {
                    const releaseAfterScreening = !!blocks[idx].releaseAfterScreening;
                    blocks[idx] = { ...blocks[idx], festivalEndTime: new Date().toISOString() };
                    await dayDoc.ref.update({ blocks });
                    if (releaseAfterScreening && blockMovieKeys && blockMovieKeys.length > 0) {
                        const updates: Record<string, any> = {};
                        for (const key of blockMovieKeys) updates[`${key}.isUnlisted`] = false;
                        await db.collection('data').doc('movies').update(updates);
                    }
                    break;
                }
            }
        } catch (e) { console.error('[AUTO-END] Catalog release error:', e); }

        console.log(`[AUTO-END] Party ${partyId} automatically ended — last film finished and grace period elapsed.`);
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('[AUTO-END] Error:', error);
        logServerError('api/auto-end-watch-party', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
