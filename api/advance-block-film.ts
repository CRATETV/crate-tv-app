import { getAdminDb } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';

// A film's recorded duration is stored in whole minutes, so a genuine
// video-ended event on a viewer's device can fire up to just under a
// minute before that rounded duration has technically "elapsed" by the
// server's clock. This tolerance absorbs that rounding gap without
// opening any real window for a client to force an early skip.
const ADVANCE_EARLY_TOLERANCE_MS = 60 * 1000;

export async function POST(request: Request): Promise<Response> {
    try {
        const { partyId, currentIndex, totalFilms } = await request.json();

        if (!partyId || currentIndex === undefined || !totalFilms) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 500 });
        const partyRef = db.collection('watch_parties').doc(partyId);

        // --- VERIFY THE CURRENT FILM HAS ACTUALLY FINISHED ---
        // This used to advance purely on the client's say-so — any request
        // with the right currentIndex/totalFilms shape could force every
        // viewer straight into the next film (or skip several, one call at
        // a time) no matter how much of the current one had actually
        // played. Same approach as api/auto-end-watch-party.ts: independently
        // re-derive the active film and its real runtime from the party's
        // own server-recorded data, and only allow the advance once that
        // film has genuinely finished.
        let blockMovieKeys: string[] | null = null;
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        for (const dayDoc of daysSnap.docs) {
            const blocks = (dayDoc.data().blocks || []) as any[];
            const match = blocks.find(b => b.id === partyId);
            if (match) { blockMovieKeys = match.movieKeys || []; break; }
        }
        if (!blockMovieKeys) {
            const settingsDoc = await db.collection('settings').doc('site').get();
            const crateFestBlocks = settingsDoc.data()?.crateFestConfig?.movieBlocks || [];
            const match = crateFestBlocks.find((b: any) => b.id === partyId);
            if (match) blockMovieKeys = match.movieKeys || [];
        }

        const activeFilmKey = blockMovieKeys && blockMovieKeys.length > 0
            ? blockMovieKeys[Math.min(currentIndex, blockMovieKeys.length - 1)]
            : null;

        // Unknown runtime (block not found, or missing duration metadata) —
        // assume a generous 3-hour ceiling rather than a duration that could
        // be trivially satisfied, same fallback auto-end-watch-party.ts uses.
        let durationMs = 3 * 60 * 60 * 1000;
        if (activeFilmKey) {
            const movieDoc = await db.collection('movies').doc(activeFilmKey).get();
            const durationMinutes = movieDoc.data()?.durationInMinutes;
            if (typeof durationMinutes === 'number' && durationMinutes > 0) {
                durationMs = durationMinutes * 60 * 1000;
            }
        }

        // MUST be a transaction, not a plain get()-then-update(). Every viewer's
        // client independently notices the film ending within the same ~1-2s
        // window and calls this endpoint concurrently. A plain read-then-write
        // lets two requests both read the same (still-current) index before
        // either write lands, so both think they're the first to advance —
        // the second write's fresh serverTimestamp then overwrites the
        // first's filmStartTime, and every viewer's playback position
        // (computed as "now minus filmStartTime") snaps back toward zero,
        // i.e. the film appears to restart. A transaction makes Firestore
        // retry one of the two conflicting attempts against fresh data
        // instead of letting them both blindly succeed, so only the true
        // first request actually advances anything.
        type AdvanceResult =
            | { kind: 'already-advanced'; serverIndex: number }
            | { kind: 'not-ready'; message: string }
            | { kind: 'ended' }
            | { kind: 'advanced'; nextIndex: number; intermissionEnd: number };

        const result: AdvanceResult = await db.runTransaction(async (tx) => {
            const partyDoc = await tx.get(partyRef);
            const currentData = partyDoc.data();
            const serverIndex = currentData?.activeMovieIndex ?? 0;

            if (serverIndex !== currentIndex) {
                return { kind: 'already-advanced', serverIndex };
            }

            // The film's own recorded start time (read fresh, in the same
            // transaction, alongside activeMovieIndex above) is the only
            // thing trusted for "has it finished" — never the client's
            // currentIndex/totalFilms alone.
            const startRef = currentData?.filmStartTime || currentData?.actualStartTime;
            if (!startRef || typeof (startRef as any).toDate !== 'function') {
                return { kind: 'not-ready', message: 'No film start time recorded yet.' };
            }
            const filmStartMs = (startRef as any).toDate().getTime();
            if (Date.now() < filmStartMs + durationMs - ADVANCE_EARLY_TOLERANCE_MS) {
                return { kind: 'not-ready', message: 'Current film has not finished yet.' };
            }

            const nextIndex = currentIndex + 1;
            const isLastFilm = nextIndex >= totalFilms;

            if (isLastFilm) {
                // isPlaying: false here too — this used to leave it true, which is
                // harmless for real viewers (status: 'ended' alone stops playback
                // client-side) but left a stale, misleading isPlaying:true sitting
                // on ended documents, indistinguishable at a glance from a party
                // that's actually stuck mid-'waiting' with isPlaying wrongly true
                // (see the WatchPartyManager.tsx preview-sync fix this shipped with).
                tx.update(partyRef, {
                    status: 'ended',
                    isPlaying: false,
                    endedAt: FieldValue.serverTimestamp(),
                });
                return { kind: 'ended' };
            }

            // FEATURE (user request — blocks running 8 films back-to-back,
            // wondering if viewers get worn down by that many short
            // intermissions in a row): give longer blocks one deliberately
            // longer break at the midpoint instead of treating every gap
            // identically — a real pause partway through, not just another
            // 30-second blink. Only kicks in for blocks long enough that
            // "halfway" actually means something (5+ films); a 2- or
            // 3-film block just gets its normal short breaks throughout.
            const STRETCH_BREAK_THRESHOLD_FILMS = 5;
            const STRETCH_BREAK_SECONDS = 90;
            const NORMAL_INTERMISSION_SECONDS = 30;
            const isStretchBreak = totalFilms >= STRETCH_BREAK_THRESHOLD_FILMS && nextIndex === Math.floor(totalFilms / 2);
            const intermissionTotalSeconds = isStretchBreak ? STRETCH_BREAK_SECONDS : NORMAL_INTERMISSION_SECONDS;
            const intermissionEnd = Date.now() + intermissionTotalSeconds * 1000;
            // FIX (user report — "the countdown to the new movie starts but
            // it still had to catch them up... they should just go into
            // the new movie when it starts"): this used to write
            // FieldValue.serverTimestamp() here — i.e. "right now," the
            // moment the PREVIOUS film ended. But the next film doesn't
            // actually start until the 30s intermission finishes. The sync
            // engine (WatchPartyPage.tsx) computes everyone's target
            // position as elapsed time since filmStartTime — so by the time
            // the intermission ended and the new film actually began, every
            // viewer's target position already read ~30 seconds in, and the
            // sync engine dutifully tried to seek/catch up EVERY viewer to
            // that position, not just genuinely late ones. Using the actual
            // future moment the film starts (matching intermissionUntil)
            // means elapsed-since-filmStartTime correctly reads ~0 for
            // everyone once the film really begins.
            const filmStartTime = new Date(intermissionEnd);
            tx.update(partyRef, {
                activeMovieIndex: nextIndex,
                intermissionUntil: intermissionEnd,
                intermissionTotalSeconds,
                isStretchBreak,
                filmStartTime,
                isPlaying: true,
                currentTime: 0,
            });
            return { kind: 'advanced', nextIndex, intermissionEnd };
        });

        if (result.kind === 'already-advanced') {
            return new Response(JSON.stringify({
                success: false,
                message: 'Index mismatch — another client already advanced',
                serverIndex: result.serverIndex,
            }), { status: 200 });
        }

        if (result.kind === 'not-ready') {
            return new Response(JSON.stringify({ success: false, message: result.message }), { status: 200 });
        }

        if (result.kind === 'ended') {
            return new Response(JSON.stringify({ success: true, status: 'ended' }), { status: 200 });
        }

        console.log(`[ADVANCE] Party ${partyId} advanced from film ${currentIndex} to ${result.nextIndex}`);

        return new Response(JSON.stringify({
            success: true,
            nextIndex: result.nextIndex,
            intermissionEnd: result.intermissionEnd,
        }), { status: 200 });

    } catch (error: any) {
        console.error('[ADVANCE] Error:', error);
        logServerError('api/advance-block-film', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
