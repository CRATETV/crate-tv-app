
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieKey = searchParams.get('movieKey');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Missing movieKey parameter.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Fetch messages ordered by timestamp ascending (oldest first)
    // We limit to the last N messages to keep the payload small
    const messagesSnapshot = await db.collection('watch_parties')
      .doc(movieKey)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limitToLast(limit)
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userName: data.userName,
        userAvatar: data.userAvatar,
        text: data.text,
        timestamp: data.timestamp,
        isVerifiedDirector: data.isVerifiedDirector || false,
        isAdmin: data.isAdmin === true,
        isSystemMessage: data.isSystemMessage === true
      };
    });

    // Live reactions from the last 10 seconds (the 😂 😲 ❤️ 👏 😢 buttons on
    // cratetv.net). The Roku asks every 5 seconds and floats each one up the
    // TV once (it remembers ids it has shown). Added Oct 2026.
    let reactions: { id: string; emoji: string }[] = [];
    if (searchParams.get('reactions') === '1') {
      try {
        const rSnap = await db.collection('watch_parties').doc(movieKey).collection('live_reactions')
          .where('timestamp', '>=', new Date(Date.now() - 10_000))
          .limit(60)
          .get();
        reactions = rSnap.docs.map(d => ({ id: d.id, emoji: String(d.data().emoji || '') }));
      } catch { /* reactions are a bonus; never break the chat over them */ }
    }

    return new Response(JSON.stringify({ messages, reactions }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
    });

  } catch (error) {
    console.error("Error fetching chat messages:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
