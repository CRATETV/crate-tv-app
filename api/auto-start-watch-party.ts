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

    // Look up movie first
    const moviesDoc = await db.collection('data').doc('movies').get();
    const movies = moviesDoc.data() || {};
    const movie = movies[movieKey];

    if (movie) {
      // Single movie — check isWatchPartyEnabled
      if (!movie.isWatchPartyEnabled) {
        return new Response(JSON.stringify({ error: 'Watch party not enabled.' }), { status: 400 });
      }
    } else {
      // Festival block — look up in data/festivalData
      const dataDoc = await db.collection('data').doc('festivalData').get();
      const festivalData = dataDoc.data();
      
      // festivalData is stored as festivalData array in the data doc
      // Try fetching from the main data document which has festivalData array
      const mainDoc = await db.collection('data').doc('main').get();
      let blockFound = false;
      
      // Search through all data docs for the block
      const dataDocs = await db.collection('data').get();
      for (const doc of dataDocs.docs) {
        const d = doc.data();
        const festArray = d.festivalData || d.festival || [];
        if (Array.isArray(festArray)) {
          for (const day of festArray) {
            const block = (day.blocks || []).find((b: any) => b.id === movieKey);
            if (block) { blockFound = true; break; }
          }
        }
        if (blockFound) break;
      }
      // Even if block not found, allow start for festival blocks
      // (block ID format check is sufficient)
      if (!blockFound && !movieKey.startsWith('block_') && !movieKey.startsWith('day')) {
        return new Response(JSON.stringify({ error: 'Movie or block not found.' }), { status: 404 });
      }
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
