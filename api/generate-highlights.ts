import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieKey = searchParams.get('movieKey');

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Missing movieKey.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Fetch messages for this watch party
    const messagesSnapshot = await db.collection('watch_parties').doc(movieKey).collection('messages').get();
    const messages = messagesSnapshot.docs.map(doc => doc.data());

    const totalMessages = messages.length;
    const uniqueViewers = new Set(messages.map(m => m.userId)).size;

    // Analyze reactions
    const reactions: Record<string, number> = {};
    messages.forEach(m => {
      if (m.type === 'reaction' && m.reactionKey) {
        reactions[m.reactionKey] = (reactions[m.reactionKey] || 0) + 1;
      }
    });

    let topReaction = 'None';
    let maxVotes = 0;
    for (const [key, count] of Object.entries(reactions)) {
      if (count > maxVotes) {
        maxVotes = count;
        topReaction = key.replace('crate_', '');
      }
    }

    return new Response(JSON.stringify({
      totalMessages,
      uniqueViewers,
      topReaction,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Generate Highlights Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
