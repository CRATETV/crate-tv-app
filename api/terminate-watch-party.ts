
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    } else {
        const db = getAdminDb();
        if (db) {
            const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
            if (!collabSnap.empty) isAuthenticated = true;
        }
    }

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ error: 'Movie identification required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    const partyRef = db.collection('watch_parties').doc(movieKey);
    
    await partyRef.update({
      status: 'ended',
      isPlaying: false,
      actualStartTime: null,
      currentTime: 0,
      lastUpdated: FieldValue.serverTimestamp(),
      backstageKey: null // Clear the key when party ends
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Watch Party Termination Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
