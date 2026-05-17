
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile } from '../types.js';

/**
 * ACTOR SEARCH TERMINAL
 * Exact Path: /api/search-actors
 * Query Param: ?q=[name]
 */
export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Fetch all profiles from the directory
    // In-memory filtering is used to support partial/contains matches which native Firestore lacks.
    const snapshot = await db.collection('actor_profiles').get();
    const results: ActorProfile[] = [];

    snapshot.forEach(doc => {
      const data = doc.data() as ActorProfile;
      // Search logic: check if name or bio contains the query string
      if (
        data.name.toLowerCase().includes(query) || 
        (data.bio && data.bio.toLowerCase().includes(query))
      ) {
        results.push({
          ...data,
          slug: doc.id // Ensure the slug is present for navigation
        });
      }
    });

    // Sort results by name for consistency
    results.sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ 
      success: true,
      query,
      count: results.length,
      actors: results 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error("Actor Search API Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal search failure" 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
