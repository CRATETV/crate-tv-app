// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-movie-likes
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  try {
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

    return new Response(JSON.stringify(likesData), { 
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            // Do not cache this response heavily, as it's meant to be live
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
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