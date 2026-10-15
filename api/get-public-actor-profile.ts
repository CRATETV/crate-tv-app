// This is a Vercel Serverless Function
// Path: /api/get-public-actor-profile
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile, Movie } from '../types.js';
import { isPublicEmbedUrl } from './get-live-data.js';

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

    // 2. Fetch all movies the actor has appeared in
    const moviesSnapshot = await db.collection('movies').get();
    let films: Movie[] = [];
    
    moviesSnapshot.forEach(doc => {
        const movie = doc.data() as Movie;
        if (movie.cast && movie.cast.some(c => c.name.trim().toLowerCase() === profile.name.trim().toLowerCase())) {
            // FIX: Spread movie first, then set key to doc.id to avoid TS2783 error
            // SECURITY (Oct 2026): never send a film's private video address in
            // this public response. Same rule as api/get-live-data.ts: only
            // public embeds (YouTube/Vimeo) keep it. Before this, anyone could
            // read a paid film's full video address from an actor's page.
            const { rokuStreamUrl: _hiddenRoku, ...rest } = movie as any;
            films.push({
                ...rest,
                fullMovie: isPublicEmbedUrl(movie.fullMovie) ? movie.fullMovie : (undefined as any),
                key: doc.id,
            });
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
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}