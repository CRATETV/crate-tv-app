
// This is a Vercel Serverless Function
// Path: /api/get-public-actors
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile, Movie, Actor, Category } from '../types.js';

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

    // 1. Fetch all movie and category data at once for efficiency
    const [moviesSnapshot, categoriesSnapshot, profilesSnapshot, usersSnapshot] = await Promise.all([
        db.collection('movies').get(),
        db.collection('categories').get(),
        db.collection('actor_profiles').get(),
        db.collection('users').where('isActor', '==', true).get()
    ]);

    const allMovies: Record<string, Movie> = {};
    moviesSnapshot.forEach(doc => {
        allMovies[doc.id] = doc.data() as Movie;
    });

    const userEmailMap = new Map<string, string>();
    usersSnapshot.forEach(doc => {
        const u = doc.data();
        if (u.name && u.email) userEmailMap.set(u.name.trim().toLowerCase(), u.email);
    });

    const classicsCategory = categoriesSnapshot.docs.find(doc => doc.id === 'publicDomainIndie')?.data() as Category | undefined;
    const classicsMovieKeys = new Set(classicsCategory?.movieKeys || []);

    const classicActorNames = new Set<string>();
    for (const key of classicsMovieKeys) {
        const movie = allMovies[key];
        if (movie && movie.cast) {
            movie.cast.forEach(actor => {
                if (actor.name && actor.name.trim()) {
                    classicActorNames.add(actor.name.trim().toLowerCase());
                }
            });
        }
    }
    
    const existingProfiles: Record<string, ActorProfile> = {};
    profilesSnapshot.forEach(doc => {
        const profile = doc.data() as ActorProfile;
        if (profile.name && !classicActorNames.has(profile.name.trim().toLowerCase())) {
             existingProfiles[doc.id] = profile;
        }
    });

    const allActorsInMovies = new Map<string, Actor>();
    // Fix: Explicitly cast Object.entries to provide strong typing for 'movie'
    (Object.entries(allMovies) as [string, Movie][]).forEach(([movieKey, movie]) => {
        if (classicsMovieKeys.has(movieKey)) return;
        
        if (movie.cast && Array.isArray(movie.cast)) {
            movie.cast.forEach(actor => {
                if (actor.name && actor.name.trim() && actor.bio && !actor.bio.toLowerCase().includes('unavailable')) {
                    const actorKey = actor.name.trim().toLowerCase();
                    const existing = allActorsInMovies.get(actorKey);
                    if (!existing || (actor.photo && !actor.photo.includes('Defaultpic') && (!existing.photo || existing.photo.includes('Defaultpic'))) || (actor.bio && actor.bio.length > (existing.bio || '').length)) {
                        allActorsInMovies.set(actorKey, actor);
                    }
                }
            });
        }
    });

    const batch = db.batch();
    let newProfilesAddedCount = 0;
    for (const actor of allActorsInMovies.values()) {
        const slug = slugify(actor.name);
        const nameLower = actor.name.trim().toLowerCase();
        if (slug && !existingProfiles[slug] && !classicActorNames.has(nameLower)) {
            const newProfile: ActorProfile = {
                name: actor.name,
                slug: slug,
                bio: actor.bio,
                photo: actor.photo,
                highResPhoto: actor.highResPhoto || actor.photo,
                imdbUrl: '',
                email: userEmailMap.get(nameLower) || '',
            };
            const newProfileRef = db.collection('actor_profiles').doc(slug);
            batch.set(newProfileRef, newProfile);
            existingProfiles[slug] = newProfile;
            newProfilesAddedCount++;
        }
    }

    if (newProfilesAddedCount > 0) {
        await batch.commit();
    }

    const allProfiles = Object.values(existingProfiles).sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ actors: allProfiles }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      },
    });

  } catch (error) {
    console.error("Error fetching public actors:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
