
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { findBlock } from './_lib/watchPartyLifecycle.js';

const cache = new Map<string, { response: any, timestamp: number }>();
// 10 seconds. Was 5 minutes, which meant a Roku could take up to 5 minutes
// to notice a party had gone live (it polls every 30s).
const CACHE_TTL = 10 * 1000;

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

    // Roku can't parse ISO dates easily, so whole seconds are sent as well.
    // filmStartTime is when the CURRENT film started (it differs from
    // actualStartTime for later films in a festival block).
    const toSecs = (v: any) => (v && typeof v.toDate === 'function') ? Math.floor(v.toDate().getTime() / 1000) : 0;
    const response = {
      status: data?.status || 'waiting',
      isPlaying: !!data?.isPlaying,
      actualStartTime: actualStartTime,
      actualStartTimeSeconds: toSecs(data?.actualStartTime),
      filmStartTimeSeconds: toSecs(data?.filmStartTime) || toSecs(data?.actualStartTime),
      activeMovieIndex: data?.activeMovieIndex ?? 0,
      isQALive: !!data?.isQALive,
      currentTime: data?.currentTime || 0,
      // Not every start path records `type`, so check the schedule itself.
      type: (await findBlock(db, movieKey)) ? 'block' : (data?.type || 'movie')
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
