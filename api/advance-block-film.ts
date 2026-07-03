import { getAdminDb } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';

export async function POST(request: Request): Promise<Response> {
    try {
        const { partyId, currentIndex, totalFilms } = await request.json();

        if (!partyId || currentIndex === undefined || !totalFilms) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 500 });
        const partyRef = db.collection('watch_parties').doc(partyId);

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
            | { kind: 'ended' }
            | { kind: 'advanced'; nextIndex: number; intermissionEnd: number };

        const result: AdvanceResult = await db.runTransaction(async (tx) => {
            const partyDoc = await tx.get(partyRef);
            const currentData = partyDoc.data();
            const serverIndex = currentData?.activeMovieIndex ?? 0;

            if (serverIndex !== currentIndex) {
                return { kind: 'already-advanced', serverIndex };
            }

            const nextIndex = currentIndex + 1;
            const isLastFilm = nextIndex >= totalFilms;

            if (isLastFilm) {
                tx.update(partyRef, {
                    status: 'ended',
                    endedAt: FieldValue.serverTimestamp(),
                });
                return { kind: 'ended' };
            }

            const intermissionEnd = Date.now() + 30000;
            tx.update(partyRef, {
                activeMovieIndex: nextIndex,
                intermissionUntil: intermissionEnd,
                filmStartTime: FieldValue.serverTimestamp(),
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
