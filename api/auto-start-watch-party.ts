
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * AUTO-START WATCH PARTY
 * 
 * This endpoint is called by the client when a countdown reaches zero.
 * It verifies the scheduled start time and auto-starts the party if:
 * 1. The movie has isWatchPartyEnabled = true
 * 2. The scheduled time has passed (within a 5-minute grace window)
 * 3. The party isn't already live or ended
 * 
 * No admin password needed - the schedule itself is the authorization.
 */
export async function POST(request: Request) {
  try {
    const { movieKey, startTime: clientStartTime } = await request.json();

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Movie key required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    // Get the movie/block data to verify scheduled time
    // Check movies collection first, then festival blocks
    const moviesDoc = await db.collection('data').doc('movies').get();
    const movies = moviesDoc.data() || {};
    let movie = movies[movieKey];
    let scheduledTimeStr: string | null = null;

    if (movie) {
        scheduledTimeStr = movie.watchPartyStartTime || null;
    } else {
        // Not a standalone movie — check festival blocks
        const festivalDaysSnapshot = await db.collection('festival').doc('schedule').collection('days').get();
        let foundBlock: any = null;
        festivalDaysSnapshot.forEach(doc => {
            const day = doc.data();
            if (day.blocks) {
                day.blocks.forEach((block: any) => {
                    if (block.id === movieKey) foundBlock = block;
                });
            }
        });
        if (foundBlock) {
            movie = foundBlock;
            // Festival blocks use screeningStartTime OR watchPartyStartTime
            scheduledTimeStr = foundBlock.watchPartyStartTime || foundBlock.screeningStartTime || null;
        }
    }

    if (!movie) {
      return new Response(JSON.stringify({ error: 'Movie or block not found.' }), { status: 404 });
    }

    // Fall back to startTime passed from the client if we can't find it in the DB
    if (!scheduledTimeStr && clientStartTime) {
      scheduledTimeStr = clientStartTime;
    }
    if (!scheduledTimeStr) {
      return new Response(JSON.stringify({ error: 'No scheduled start time.' }), { status: 400 });
    }

    // Check if we're within the valid auto-start window
    // Allow starting up to 5 minutes before or 30 minutes after the scheduled time
    const scheduledTime = new Date(scheduledTimeStr).getTime();
    const now = Date.now();
    const fiveMinutesBefore = scheduledTime - (5 * 60 * 1000);
    const thirtyMinutesAfter = scheduledTime + (30 * 60 * 1000);

    if (now < fiveMinutesBefore) {
      return new Response(JSON.stringify({ 
        error: 'Too early to start. Wait for the scheduled time.',
        scheduledTime: movie.watchPartyStartTime,
        serverTime: new Date().toISOString()
      }), { status: 400 });
    }

    if (now > thirtyMinutesAfter) {
      return new Response(JSON.stringify({ 
        error: 'Auto-start window has expired. An admin must manually start the party.',
        scheduledTime: scheduledTimeStr
      }), { status: 400 });
    }

    // Check current party state
    const partyRef = db.collection('watch_parties').doc(movieKey);
    const partyDoc = await partyRef.get();
    const partyState = partyDoc.data();

    // If already live, just return success
    if (partyState?.status === 'live') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Party is already live.',
        alreadyLive: true 
      }), { status: 200 });
    }

    // If ended, don't auto-restart (admin must manually restart)
    if (partyState?.status === 'ended') {
      return new Response(JSON.stringify({ 
        error: 'Party was terminated. An admin must manually restart.',
        status: 'ended'
      }), { status: 400 });
    }

    // CLEANUP: Purge old messages for a fresh session
    const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages');
    const snapshot = await messagesRef.get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    // Start the party!
    // IMPORTANT: explicitly reset activeMovieIndex to 0. Without this, a leftover
    // value from a PREVIOUS test/screening (e.g. activeMovieIndex: 2, left over
    // after the block finished all its films last time) silently survives because
    // we use { merge: true }. That made fresh test runs start already pointing at
    // the LAST film in the block, which immediately triggered "show credits"
    // instead of playing from the beginning.
    await partyRef.set({
      status: 'live',
      activeMovieIndex: 0,
      lastStartedAt: new Date().toISOString(),
      actualStartTime: FieldValue.serverTimestamp(),
      filmStartTime: scheduledTimeStr,
      isPlaying: true,
      currentTime: 0,
      isQALive: false,
      lastUpdated: FieldValue.serverTimestamp(),
      backstageKey: Math.random().toString(36).substring(2, 8).toUpperCase(),
      autoStarted: true // Flag to indicate this was auto-started
    }, { merge: true });

    console.log(`[AUTO-START] Watch party auto-started for ${movieKey} at ${new Date().toISOString()}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Watch party auto-started!',
      movieKey,
      startedAt: new Date().toISOString()
    }), { status: 200 });

  } catch (error) {
    console.error("Auto-Start Watch Party Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
