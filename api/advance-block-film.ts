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
        const partyDoc = await partyRef.get();

        // Guard: only advance if current index matches what we expect
        // This prevents double-advances if multiple clients fire at once
        const currentData = partyDoc.data();
        const serverIndex = currentData?.activeMovieIndex ?? 0;
        
        if (serverIndex !== currentIndex) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Index mismatch — another client already advanced',
                serverIndex 
            }), { status: 200 });
        }

        const nextIndex = currentIndex + 1;
        const isLastFilm = nextIndex >= totalFilms;

        if (isLastFilm) {
            // All films done — end the party
            await partyRef.update({
                status: 'ended',
                endedAt: FieldValue.serverTimestamp(),
            });
            return new Response(JSON.stringify({ success: true, status: 'ended' }), { status: 200 });
        }

        // Advance to next film with 30-second intermission
        const intermissionEnd = Date.now() + 30000;
        await partyRef.update({
            activeMovieIndex: nextIndex,
            intermissionUntil: intermissionEnd,
            filmStartTime: FieldValue.serverTimestamp(),
            isPlaying: true,
            currentTime: 0,
        });

        console.log(`[ADVANCE] Party ${partyId} advanced from film ${currentIndex} to ${nextIndex}`);

        return new Response(JSON.stringify({ 
            success: true, 
            nextIndex,
            intermissionEnd 
        }), { status: 200 });

    } catch (error: any) {
        console.error('[ADVANCE] Error:', error);
        logServerError('api/advance-block-film', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
