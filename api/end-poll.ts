import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, backstageKey, pollId } = await request.json();

    if (!movieKey || !backstageKey || !pollId) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const partyRef = db.collection('watch_parties').doc(movieKey);
    const partyDoc = await partyRef.get();

    if (!partyDoc.exists) {
      return new Response(JSON.stringify({ error: 'Watch party not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const partyData = partyDoc.data();
    if (partyData?.backstageKey?.toUpperCase() !== backstageKey.toUpperCase()) {
      return new Response(JSON.stringify({ error: 'Invalid Backstage Key.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const activePoll = partyData?.activePoll;
    if (!activePoll || activePoll.id !== pollId) {
      return new Response(JSON.stringify({ error: 'Poll not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedPoll = {
      ...activePoll,
      isOpen: false
    };

    await partyRef.update({ 
      activePoll: updatedPoll,
      lastUpdated: FieldValue.serverTimestamp() 
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("End Poll Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
