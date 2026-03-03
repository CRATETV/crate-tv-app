
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const cache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 300 * 1000; // 5 minutes (300 seconds)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieKey = searchParams.get('movieKey');

    if (!movieKey) {
      return new Response(JSON.stringify({ error: 'Movie identification required.' }), { status: 400 });
    }

    const nowTime = Date.now();
    const cached = cache.get(movieKey);
    if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
        return new Response(JSON.stringify(cached.response), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    const partyDoc = await db.collection('watch_parties').doc(movieKey).get();
    
    if (!partyDoc.exists) {
      const response = { 
        status: 'waiting',
        isPlaying: false,
        actualStartTime: null
      };
      cache.set(movieKey, { response, timestamp: nowTime });
      return new Response(JSON.stringify(response), { status: 200 });
    }

    const data = partyDoc.data();
    
    // Convert Firestore Timestamp to ISO string for the client
    let actualStartTime = null;
    if (data?.actualStartTime) {
        actualStartTime = data.actualStartTime.toDate().toISOString();
    }

    const response = {
      status: data?.status || 'waiting',
      isPlaying: !!data?.isPlaying,
      actualStartTime: actualStartTime,
      currentTime: data?.currentTime || 0,
      type: data?.type || 'movie'
    };

    cache.set(movieKey, { response, timestamp: nowTime });

    return new Response(JSON.stringify(response), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });

  } catch (error) {
    console.error("Get Watch Party Status Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
