// This is a Vercel Serverless Function
// Path: /api/get-public-actor-profile
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.ts';
import { ActorProfile, Movie } from '../types.ts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Actor slug is required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // 1. Fetch the actor's profile
    const actorProfileRef = db.collection('actor_profiles').doc(slug);
    const actorProfileDoc = await actorProfileRef.get();

    if (!actorProfileDoc.exists) {
      return new Response(JSON.stringify({ error: 'Actor not found.' }), { status: 404 });
    }
    const profile = actorProfileDoc.data() as ActorProfile;

    // 2. Fetch all movies the actor has appeared in by iterating
    const films: Movie[] = [];
    const allMoviesSnapshot = await db.collection('movies').get();
    allMoviesSnapshot.forEach(doc => {
        const movie = doc.data() as Movie;
        // Make sure cast exists and is an array before searching
        if (Array.isArray(movie.cast) && movie.cast.some(c => c.name === profile.name)) {
            films.push(movie);
        }
    });

    return new Response(JSON.stringify({ profile, films }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      },
    });

  } catch (error) {
    console.error("Error fetching public actor profile:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
