import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, backstageKey, question, options } = await request.json();

    if (!movieKey || !backstageKey || !question || !options || !Array.isArray(options)) {
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

    const pollId = `poll_${Date.now()}`;
    const initialVotes: Record<number, number> = {};
    options.forEach((_, index) => {
      initialVotes[index] = 0;
    });

    const activePoll = {
      id: pollId,
      question,
      options,
      votes: initialVotes,
      voters: [],
      isOpen: true
    };

    await partyRef.update({ 
      activePoll,
      lastUpdated: FieldValue.serverTimestamp() 
    });

    return new Response(JSON.stringify({ success: true, pollId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Create Poll Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
