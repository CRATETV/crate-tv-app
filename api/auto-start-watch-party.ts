import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';

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

    // Validate the movie/block exists — but don't block auto-start if lookup fails.
    // The countdown timer is sufficient proof this is a legitimate start request.
    // We only hard-block if it's a single movie with isWatchPartyEnabled explicitly false.
    const moviesDoc = await db.collection('data').doc('movies').get();
    const movies = moviesDoc.data() || {};
    const movie = movies[movieKey];
    if (movie && !movie.isWatchPartyEnabled) {
      return new Response(JSON.stringify({ error: 'Watch party not enabled.' }), { status: 400 });
    }

    // Every viewer's lobby independently calls this the moment its local
    // countdown hits 0 (and retries every few seconds until it sees
    // status==='live'), so this route can receive many near-simultaneous
    // calls for the same party. The check-then-write used to be two
    // separate steps — a plain read, then an unconditional `.set()` a
    // moment later — so multiple concurrent callers could all read
    // "not live yet," and all proceed to write, each generating a *new*
    // random backstageKey and clobbering whichever one a director/press
    // contact may already have been given. Doing the check-and-set inside
    // one transaction makes Firestore itself pick exactly one winner;
    // everyone else gets back `alreadyLive: true` with no write at all.
    const partyRef = db.collection('watch_parties').doc(movieKey);
    const txResult = await db.runTransaction(async (tx) => {
      const partyDoc = await tx.get(partyRef);
      const partyState = partyDoc.data();

      if (partyState?.status === 'live') {
        return { outcome: 'already-live' as const };
      }
      if (partyState?.status === 'ended') {
        return { outcome: 'ended' as const };
      }

      tx.set(partyRef, {
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
        // Only mint a new key if this party doesn't already have one —
        // otherwise a party that somehow cycles through this path twice
        // (e.g. a prior partial/aborted start) would silently invalidate
        // a key that may already have been shared with a director.
        backstageKey: partyState?.backstageKey || Math.random().toString(36).substring(2, 8).toUpperCase(),
        autoStarted: true
      }, { merge: true });

      return { outcome: 'started' as const };
    });

    if (txResult.outcome === 'already-live') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Party is already live.',
        alreadyLive: true
      }), { status: 200 });
    }

    if (txResult.outcome === 'ended') {
      return new Response(JSON.stringify({
        error: 'Party was terminated. An admin must manually restart.',
        status: 'ended'
      }), { status: 400 });
    }

    // Only the single winning caller (the one whose transaction actually
    // flipped status to 'live') reaches here, so this purge can never run
    // more than once per start.
    const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages');
    const snapshot = await messagesRef.get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Watch party started!',
      movieKey,
      startedAt: new Date().toISOString()
    }), { status: 200 });

  } catch (error) {
    console.error("Auto-Start Watch Party Error:", error);
    logServerError('api/auto-start-watch-party', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
