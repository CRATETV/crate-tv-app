
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: Request) {
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
        const batch = db.batch();
        let mutationsCount = 0;

        // 1. AUTO-START Logic: Waiting -> Live
        const moviesSnapshot = await db.collection('movies').where('isWatchPartyEnabled', '==', true).get();
        const partiesSnapshot = await db.collection('watch_parties').get();
        const partyStates = new Map();
        partiesSnapshot.forEach(doc => partyStates.set(doc.id, doc.data()));

        moviesSnapshot.forEach(doc => {
            const movie = doc.data();
            const state = partyStates.get(doc.id);
            const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
            
            // If scheduled time has passed and party isn't live, START IT
            if (startTime && startTime <= now && (!state || state.status !== 'live')) {
                batch.set(db.collection('watch_parties').doc(doc.id), {
                    status: 'live',
                    isPlaying: true,
                    currentTime: 0,
                    actualStartTime: FieldValue.serverTimestamp(),
                    lastUpdated: FieldValue.serverTimestamp(),
                    backstageKey: Math.random().toString(36).substring(2, 8).toUpperCase()
                }, { merge: true });
                mutationsCount++;
            }
        });

        // 2. CLEANUP Logic: End stale live sessions
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const activeParties = await db.collection('watch_parties').where('status', '==', 'live').get();
        
        activeParties.forEach(doc => {
            const data = doc.data();
            const lastUpdated = data.lastUpdated?.toDate();
            if (lastUpdated && lastUpdated < twelveHoursAgo) {
                batch.update(doc.ref, { 
                    status: 'ended', 
                    isPlaying: false,
                    lastUpdated: FieldValue.serverTimestamp()
                });
                mutationsCount++;
            }
        });

        if (mutationsCount > 0) {
            await batch.commit();
        }

        return new Response(JSON.stringify({ success: true, mutationsCount }), { status: 200 });

    } catch (error) {
        console.error("Error in update-watch-parties cron job:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
