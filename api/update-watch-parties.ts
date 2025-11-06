// This is a Vercel Serverless Function
// It will be accessible at the path /api/update-watch-parties
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, WatchPartyState } from '../types.js';

export async function GET(request: Request) {
    // Cron Job Authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const now = new Date();
        const moviesSnapshot = await db.collection('movies').get();
        const partiesRef = db.collection('watch_parties');
        
        const batch = db.batch();
        let updatesCount = 0;

        for (const movieDoc of moviesSnapshot.docs) {
            const movie = { id: movieDoc.id, ...movieDoc.data() } as Movie & { id: string };

            if (movie.isWatchPartyEnabled && movie.watchPartyStartTime && now >= new Date(movie.watchPartyStartTime)) {
                const partyDoc = await partiesRef.doc(movie.id).get();
                const partyState = partyDoc.data() as WatchPartyState | undefined;

                // If party is upcoming (no state yet) or has ended, set it to 'waiting'.
                if (!partyState || (partyState.status !== 'waiting' && partyState.status !== 'live')) {
                    console.log(`Cron: Updating ${movie.title} to 'waiting' status.`);
                    const newState: Partial<WatchPartyState> = {
                        status: 'waiting',
                        isPlaying: false,
                        currentTime: 0,
                    };
                    batch.set(partiesRef.doc(movie.id), newState, { merge: true });
                    updatesCount++;
                }
            }
        }

        if (updatesCount > 0) {
            await batch.commit();
            return new Response(JSON.stringify({ success: true, updated: updatesCount }), { status: 200 });
        }

        return new Response(JSON.stringify({ success: true, updated: 0 }), { status: 200 });

    } catch (error) {
        console.error("Error in update-watch-parties cron job:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
