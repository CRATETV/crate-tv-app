
// This is a Vercel Serverless Function
// Path: /api/start-watch-party
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { movieKey, password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    } else {
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }
    const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) isAuthenticated = true;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ error: 'A movie key is required to start the party.' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // CLEANUP: Purge old messages before starting new party to ensure a clean slate
    const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages');
    const oldMessages = await messagesRef.limit(500).get();
    
    if (!oldMessages.empty) {
        const batch = db.batch();
        oldMessages.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`[Watch Party] Purged ${oldMessages.size} messages for a fresh start on ${movieKey}.`);
    }

    const partyRef = db.collection('watch_parties').doc(movieKey);
    
    // Set the status to 'live'. This will be picked up by listeners on the client-side.
    await partyRef.set({
      status: 'live',
      lastStartedAt: new Date().toISOString()
    }, { merge: true });

    return new Response(JSON.stringify({ success: true, message: 'Watch party started with a fresh chat!' }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error starting watch party:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
