// api/create-watch-party.ts
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'movieKey is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('DB connection failed');
    
    const newPartyRef = await db.collection('watch_parties').add({
      movieKey,
      state: 'paused',
      currentTime: 0,
      host: null, // Will be claimed by the first user who joins
      createdAt: FieldValue.serverTimestamp(),
      lastUpdatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ partyId: newPartyRef.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error creating watch party:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
