
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieKey = searchParams.get('movieKey');

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Movie identification required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    const partyDoc = await db.collection('watch_parties').doc(movieKey).get();
    
    if (!partyDoc.exists) {
      return new Response(JSON.stringify({ 
        status: 'waiting',
        isPlaying: false,
        actualStartTime: null
      }), { status: 200 });
    }

    const data = partyDoc.data();
    
    // Convert Firestore Timestamp to ISO string for the client
    let actualStartTime = null;
    if (data?.actualStartTime) {
        actualStartTime = data.actualStartTime.toDate().toISOString();
    }

    return new Response(JSON.stringify({
      status: data?.status || 'waiting',
      isPlaying: !!data?.isPlaying,
      actualStartTime: actualStartTime,
      currentTime: data?.currentTime || 0,
      type: data?.type || 'movie'
    }), { status: 200 });

  } catch (error) {
    console.error("Get Watch Party Status Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
