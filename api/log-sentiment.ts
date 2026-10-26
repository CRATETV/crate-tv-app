import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
  try {
    if (!rateLimit(`log-sentiment:${getIP(request)}`, 120, 10 * 60_000)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
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