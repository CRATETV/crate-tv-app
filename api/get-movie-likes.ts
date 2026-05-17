// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-movie-likes
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const cache = {
    data: null as any,
    timestamp: 0
};
const CACHE_TTL = 300 * 1000; // 5 minutes

export async function GET(request: Request) {
  try {
    const nowTime = Date.now();
    if (cache.data && (nowTime - cache.timestamp < CACHE_TTL)) {
        return new Response(JSON.stringify(cache.data), { 
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
    }

    const initError = getInitializationError();
    if (initError) {
        throw new Error(`Firebase Admin connection failed: ${initError}`);
    }
    
    const db = getAdminDb();
    if (!db) {
        throw new Error("Database connection failed. Could not fetch likes.");
    }
    
    const moviesSnapshot = await db.collection('movies').get();
    
    const likesData: Record<string, number> = {};
    moviesSnapshot.forEach(doc => {
        const movieData = doc.data();
        // Ensure likes is a number, default to 0 if it's missing or not a number
        likesData[doc.id] = typeof movieData.likes === 'number' ? movieData.likes : 0;
    });

    cache.data = likesData;
    cache.timestamp = nowTime;

    return new Response(JSON.stringify(likesData), { 
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'X-Cache': 'MISS'
        }
    });
  } catch (error) {
    console.error("Error fetching movie likes:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch likes.";
    return new Response(JSON.stringify({ error: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}