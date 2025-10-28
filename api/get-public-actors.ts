// This is a Vercel Serverless Function
// Path: /api/get-public-actors
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { ActorProfile } from '../types';

export async function GET(request: Request) {
  try {
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const actorsSnapshot = await db.collection('actor_profiles').orderBy('name').get();
    
    const actors: ActorProfile[] = [];
    actorsSnapshot.forEach(doc => {
        actors.push(doc.data() as ActorProfile);
    });

    return new Response(JSON.stringify({ actors }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // Cache for 5 mins
      },
    });

  } catch (error) {
    console.error("Error fetching public actors:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}