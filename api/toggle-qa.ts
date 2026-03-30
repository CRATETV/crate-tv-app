
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, backstageKey, isQALive, qaEmbed, isWebcamLive } = await request.json();

    if (!movieKey || !backstageKey) {
      return new Response(JSON.stringify({ error: 'Movie key and Backstage key required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const partyRef = db.collection('watch_parties').doc(movieKey);
    const partySnap = await partyRef.get();

    if (!partySnap.exists) {
      return new Response(JSON.stringify({ error: 'Watch party not found.' }), { status: 404 });
    }

    const partyData = partySnap.data();
    if (partyData?.backstageKey !== backstageKey) {
      return new Response(JSON.stringify({ error: 'Invalid Backstage key.' }), { status: 401 });
    }

    await partyRef.update({
      isQALive: !!isQALive,
      qaEmbed: qaEmbed || '',
      isWebcamLive: !!isWebcamLive,
      lastUpdated: FieldValue.serverTimestamp()
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Toggle QA Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
