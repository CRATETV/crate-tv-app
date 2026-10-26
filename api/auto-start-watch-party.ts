import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { getBackstageKey, setBackstageKey } from './_lib/backstage.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { findBlock, purgePartyMessages, newBackstageKey, shouldAutoStart, toMillis } from './_lib/watchPartyLifecycle.js';
import { isStaleLive } from './_lib/watchPartyRules.js';

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
    let movie = movies[movieKey];
    if (!movie) {
      // Not every film has an entry in data/movies — fall back to its own doc.
      const movieDoc = await db.collection('movies').doc(movieKey).get();
      if (movieDoc.exists) movie = movieDoc.data();
    }
    if (movie && !movie.isWatchPartyEnabled) {
      return new Response(JSON.stringify({ error: 'Watch party not enabled.' }), { status: 400 });
    }

    // SECURITY: this route is public (every viewer's lobby calls it when its
    // countdown hits zero), so the server decides whether it's really time.
    // This used to check only standalone movies — a festival block id skipped
    // the check entirely, so anyone could start a block hours early. Both now
    // use the scheduled start, with a 2-minute allowance for fast device clocks.
    const blockLookup = movie ? null : await findBlock(db, movieKey);
    const scheduledStr = movie?.watchPartyStartTime
        || blockLookup?.block?.watchPartyStartTime
        || blockLookup?.block?.screeningStartTime
        || null;
    const scheduledMs = toMillis(scheduledStr);
    if (!movie && !blockLookup) {
      return new Response(JSON.stringify({ error: 'Unknown watch party.' }), { status: 404 });
    }
    if (blockLookup && blockLookup.block?.isWatchPartyEnabled === false) {
      return new Response(JSON.stringify({ error: 'Watch party not enabled.' }), { status: 400 });
    }
    if (scheduledMs == null) {
      return new Response(JSON.stringify({ error: 'No start time scheduled — an admin must start this party.' }), { status: 400 });
    }
    if (Date.now() < scheduledMs - 2 * 60_000) {
      return new Response(JSON.stringify({ error: 'Too early — this watch party has not started yet.', startsAt: scheduledStr }), { status: 425 });
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
    const existingKey = await getBackstageKey(db, movieKey);
    const txResult = await db.runTransaction(async (tx) => {
      const partyDoc = await tx.get(partyRef);
      const partyState = partyDoc.data();

      // Live from an earlier run that was never ended doesn't count (Oct 26 2026).
      if (partyState?.status === 'live' && !isStaleLive(partyState, scheduledMs)) {
        return { outcome: 'already-live' as const };
      }
      // Ended parties only restart if this is a NEW scheduled run (the
      // scheduled start is later than when it last ended) — same rule the
      // every-minute scheduler uses.
      if (partyState?.status === 'ended' && !shouldAutoStart({
        scheduledStartMs: scheduledMs,
        nowMs: Math.max(Date.now(), scheduledMs),
        partyState,
        blockFestivalEndTime: blockLookup?.block?.festivalEndTime,
      })) {
        return { outcome: 'ended' as const };
      }

      // Keep an existing key (it may already be shared with a director).
      if (!existingKey) setBackstageKey(db, movieKey, newBackstageKey(), tx);
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
        backstageKey: null, // stored server-side only — see api/_lib/backstage.ts
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
    await purgePartyMessages(db, movieKey);

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
