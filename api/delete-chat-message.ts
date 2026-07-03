import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { movieKey, messageId, adminPassword } = await request.json();

    if (!movieKey || !messageId || !adminPassword) {
      return new Response(JSON.stringify({ error: 'MovieKey, messageId, and Password required.' }), {
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

    const messageRef = db.collection('watch_parties').doc(movieKey).collection('messages').doc(messageId);
    const snap = await messageRef.get();

    if (!snap.exists) {
      return new Response(JSON.stringify({ success: true, message: 'Message already gone.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await messageRef.delete();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete Chat Message Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
