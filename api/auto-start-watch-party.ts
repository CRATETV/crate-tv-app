import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Movie key required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    // Check current party state first
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

    // If ended, don't auto-restart
    if (partyState?.status === 'ended') {
      return new Response(JSON.stringify({ 
        error: 'Party was terminated. An admin must manually restart.',
        status: 'ended'
      }), { status: 400 });
    }

    // Validate the movie/block exists — but don't block auto-start if lookup fails.
    // The countdown timer is sufficient proof this is a legitimate start request.
    // We only hard-block if it's a single movie with isWatchPartyEnabled explicitly false.
    const moviesDoc = await db.collection('data').doc('movies').get();
    const movies = moviesDoc.data() || {};
    const movie = movies[movieKey];
    if (movie && !movie.isWatchPartyEnabled) {
      return new Response(JSON.stringify({ error: 'Watch party not enabled.' }), { status: 400 });
    }

    // CLEANUP: Purge old messages
    const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages');
    const snapshot = await messagesRef.get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    // Start the party!
    await partyRef.set({
      status: 'live',
      lastStartedAt: new Date().toISOString(),
      actualStartTime: FieldValue.serverTimestamp(),
      isPlaying: true,
      currentTime: 0,
      activeMovieIndex: 0,
      filmStartTime: FieldValue.serverTimestamp(),
      intermissionUntil: null,
      isQALive: false,
      lastUpdated: FieldValue.serverTimestamp(),
      backstageKey: Math.random().toString(36).substring(2, 8).toUpperCase(),
      autoStarted: true
    }, { merge: true });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Watch party started!',
      movieKey,
      startedAt: new Date().toISOString()
    }), { status: 200 });

  } catch (error) {
    console.error("Auto-Start Watch Party Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
