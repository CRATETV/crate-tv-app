import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, userId, pollId, optionIndex } = await request.json();

    if (!movieKey || !userId || !pollId || optionIndex === undefined) {
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
    const activePoll = partyData?.activePoll;

    if (!activePoll || activePoll.id !== pollId || !activePoll.isOpen) {
      return new Response(JSON.stringify({ error: 'Poll is closed or not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (activePoll.voters.includes(userId)) {
      return new Response(JSON.stringify({ error: 'You have already voted.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedVotes = { ...activePoll.votes };
    updatedVotes[optionIndex] = (updatedVotes[optionIndex] || 0) + 1;

    const updatedPoll = {
      ...activePoll,
      votes: updatedVotes,
      voters: [...activePoll.voters, userId]
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
    console.error("Vote Poll Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
