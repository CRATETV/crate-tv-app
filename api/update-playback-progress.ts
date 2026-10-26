import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';

// Saves where a signed-in viewer stopped in a film.
//
// SECURITY (Oct 2026 audit): this used to take userId from the request, so
// anyone could write (any amount of) data into any account, enough to push a
// stranger's account past Firestore's size limit and break it. The account
// now comes from a verified sign-in, and the values are checked.
export async function POST(request: Request) {
  try {
    const { movieKey, seconds, idToken } = await request.json().catch(() => ({}));
    const key = typeof movieKey === 'string' ? movieKey.trim() : '';
    const secs = Number(seconds);
    if (!key || key.length > 200 || /[.\/\[\]*`~#]/.test(key) || !Number.isFinite(secs) || secs < 0 || secs > 24 * 60 * 60) {
      return new Response(JSON.stringify({ error: 'Invalid progress.' }), { status: 400 });
    }
    if (typeof idToken !== 'string' || !idToken) {
      return new Response(JSON.stringify({ error: 'Sign in required.' }), { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Database connection failed: ${initError}`);
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error('Database connection is not available.');

    let uid: string;
    try { uid = (await auth.verifyIdToken(idToken)).uid; }
    catch { return new Response(JSON.stringify({ error: 'Invalid session.' }), { status: 401 }); }

    await db.collection('users').doc(uid).set({ playbackProgress: { [key]: Math.round(secs) } }, { merge: true });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error updating playback progress:', error);
    return new Response(JSON.stringify({ error: 'Could not save progress.' }), { status: 500 });
  }
}
