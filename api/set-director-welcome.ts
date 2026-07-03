import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

// Sets (or clears) the "welcome message from the director" shown to viewers
// in the watch party lobby. This used to be a direct client write to
// watch_parties/{partyId} from the admin's browser — which firestore.rules
// blocks entirely ("allow write: if false; // server only", same rule that
// was blocking the film-advance endpoint before that got fixed). The write
// was silently failing, which is why the message never actually showed up
// for anyone. Routed through the Admin SDK here instead, same pattern as
// every other privileged watch-party action.
export async function POST(request: Request) {
  try {
    const { movieKey, message, password } = await request.json();

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
        return new Response(JSON.stringify({ error: 'Party identification required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('Database offline.');

    await db.collection('watch_parties').doc(movieKey).set({
        directorWelcome: message ?? '',
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Set Director Welcome Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
