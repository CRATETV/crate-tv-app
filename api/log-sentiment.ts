import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, type, timestamp } = await request.json();

    if (!movieKey || !type || timestamp === undefined) {
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("DB unreachable");

    await db.collection('movies').doc(movieKey).collection('sentiment').add({
      type,
      timestamp,
      serverTimestamp: FieldValue.serverTimestamp()
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}