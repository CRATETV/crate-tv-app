import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { movieKey, adminPassword } = await request.json();

    if (!movieKey || !adminPassword) {
      return new Response(JSON.stringify({ error: 'MovieKey and Password required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== process.env.ADMIN_MASTER_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid admin password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed");

    const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages');
    const snapshot = await messagesRef.get();
    
    if (snapshot.empty) {
      return new Response(JSON.stringify({ success: true, message: 'Chat already empty.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clear Chat Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
