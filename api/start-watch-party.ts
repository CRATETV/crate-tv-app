
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { setBackstageKey } from './_lib/backstage.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { purgePartyMessages, newBackstageKey } from './_lib/watchPartyLifecycle.js';

export async function POST(request: Request) {
  try {
    const { movieKey, password } = await request.json();

    if (!(await verifyAdminPassword(password))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ error: 'Movie identification required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    // CLEANUP: Purge old messages for a fresh session
    await purgePartyMessages(db, movieKey);

    const partyRef = db.collection('watch_parties').doc(movieKey);
    
    // Check if party is already live - don't reset actualStartTime
    // Always reset to a clean live state — this allows restarting stuck parties
    
    // Set canonical initial state. 
    // actualStartTime is the "T-Zero" for global synchronization.
    await partyRef.set({
      status: 'live',
      lastStartedAt: new Date().toISOString(),
      actualStartTime: FieldValue.serverTimestamp(),
      filmStartTime: FieldValue.serverTimestamp(), // tracks when the CURRENT film started
      isPlaying: true,
      currentTime: 0,
      isQALive: false,
      lastUpdated: FieldValue.serverTimestamp(),
      activeMovieIndex: 0,             // always start at film 0
      intermissionUntil: null,         // no intermission at start
      backstageKey: null, // now stored server-side only (api/_lib/backstage.ts)
    }, { merge: true });

    await setBackstageKey(db, movieKey, newBackstageKey());

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Watch Party Launch Error:", error);
    logServerError('api/start-watch-party', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
