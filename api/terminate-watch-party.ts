import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { finalizeEndedParty } from './_lib/watchPartyLifecycle.js';
import { setBackstageKey } from './_lib/backstage.js';

// Admin "End Party". Uses the shared admin check (constant-time, honours
// revoked collaborator keys) and the shared shutdown steps, so a manually
// ended party is left in exactly the same state as an automatically ended
// one — including the festivalEndTime stamp that stops the scheduler from
// ever re-starting the block.

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
    if (!db) throw new Error('Database offline.');

    await db.collection('watch_parties').doc(movieKey).set({
      status: 'ended',
      isPlaying: false,
      actualStartTime: null,
      currentTime: 0,
      backstageKey: null,
      lastUpdated: FieldValue.serverTimestamp(),
      endedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await setBackstageKey(db, movieKey, null);
    await finalizeEndedParty(db, movieKey);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Watch Party Termination Error:', error);
    logServerError('api/terminate-watch-party', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
