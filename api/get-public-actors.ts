// This is a Vercel Serverless Function
// Path: /api/get-public-actors
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile, Movie, Actor } from '../types.js';

const slugify = (name: string): string => {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // collapse whitespace and replace with -
        .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
};

export async function GET(request: Request) {
  try {
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // 1. Get all existing profiles from the dedicated collection
    const profilesSnapshot = await db.collection('actor_profiles').get();
    const existingProfiles: Record<string, ActorProfile> = {};
    profilesSnapshot.forEach(doc => {
        existingProfiles[doc.id] = doc.data() as ActorProfile;
    });

    // 2. Scan all movies to find any actors with bios that are missing from the profiles collection
    const allActorsInMovies = new Map<string, Actor>();
    const moviesSnapshot = await db.collection('movies').get();
    moviesSnapshot.forEach(doc => {
        const movie = doc.data() as Movie;
        if (movie.cast && Array.isArray(movie.cast)) {
            movie.cast.forEach(actor => {
                // Check for a meaningful bio and a name
                if (actor.name && actor.name.trim() && actor.bio && !actor.bio.toLowerCase().includes('unavailable')) {
                    const actorKey = actor.name.trim().toLowerCase();
                    const existing = allActorsInMovies.get(actorKey);
                    // Heuristic: keep the actor entry with the most complete data (non-default photo, longest bio)
                    if (!existing || 
                        (actor.photo && !actor.photo.includes('Defaultpic') && (!existing.photo || existing.photo.includes('Defaultpic'))) ||
                        (actor.bio && actor.bio.length > (existing.bio || '').length)
                    ) {
                        allActorsInMovies.set(actorKey, actor);
                    }
                }
            });
        }
    });

    // 3. Create a batch to add any new profiles found in movies
    const batch = db.batch();
    let newProfilesAddedCount = 0;
    for (const actor of allActorsInMovies.values()) {
        const slug = slugify(actor.name);
        if (slug && !existingProfiles[slug]) {
            // This actor is in a movie with a bio but not in the profiles collection. Add them.
            const newProfile: ActorProfile = {
                name: actor.name,
                slug: slug,
                bio: actor.bio,
                photo: actor.photo,
                highResPhoto: actor.highResPhoto || actor.photo, // Fallback highResPhoto to photo
                imdbUrl: '', // Default to empty, can be updated by actor
            };
            const newProfileRef = db.collection('actor_profiles').doc(slug);
            batch.set(newProfileRef, newProfile);
            existingProfiles[slug] = newProfile; // Add to our in-memory list to return immediately
            newProfilesAddedCount++;
        }
    }

    // 4. Commit the new profiles if any were found
    if (newProfilesAddedCount > 0) {
        await batch.commit();
        console.log(`[get-public-actors] Backfilled ${newProfilesAddedCount} actor profiles.`);
    }

    // 5. Return all profiles, sorted alphabetically
    const allProfiles = Object.values(existingProfiles).sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ actors: allProfiles }), {
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