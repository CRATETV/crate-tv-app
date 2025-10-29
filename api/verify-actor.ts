// This is a Vercel Serverless Function
// Path: /api/verify-actor
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { Movie } from '../types';

const portalPassword = 'cratebio';

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json();

    if (password !== portalPassword) {
      return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!name) {
      return new Response(JSON.stringify({ error: 'Actor name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const moviesSnapshot = await db.collection('movies').get();
    let actorFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        if (actorFound) return;
        const movieData = movieDoc.data() as Movie;
        if (Array.isArray(movieData.cast)) {
            if (movieData.cast.some(actor => 
                actor && typeof actor.name === 'string' && actor.name.trim().toLowerCase() === trimmedName
            )) {
                actorFound = true;
            }
        }
    });

    if (!actorFound) {
      return new Response(JSON.stringify({ error: 'Actor name not found in our records. Please ensure it matches film credits exactly.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in verify-actor API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}