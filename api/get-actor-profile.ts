// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-actor-profile
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile, Movie, Actor } from '../types.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Database or Auth connection failed.");

    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data()?.name) {
        return new Response(JSON.stringify({ error: "Your user profile could not be found or is incomplete. Please contact support." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
    }
    const actorName = userDoc.data()!.name;

    const actorSlug = slugify(actorName);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileDoc = await actorProfileRef.get();

    if (actorProfileDoc.exists) {
      const profile = actorProfileDoc.data() as ActorProfile;
      return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }

    // Profile NOT found, attempt to generate it from movie data
    console.log(`Profile for slug '${actorSlug}' not found. Attempting to generate from movie data.`);

    const moviesSnapshot = await db.collection('movies').get();
    let bestActorData: Actor | null = null;
    const trimmedName = actorName.trim().toLowerCase();

    for (const movieDoc of moviesSnapshot.docs) {
        const movieData = movieDoc.data() as Movie;
        if (movieData.cast) {
            const matchedActor = movieData.cast.find(actor => actor.name.trim().toLowerCase() === trimmedName);
            if (matchedActor) {
                // Heuristic to find the "best" profile data.
                // Prioritize profiles with non-default photos and longer bios.
                if (!bestActorData || 
                    (matchedActor.photo && !matchedActor.photo.includes('Defaultpic.png') && (!bestActorData.photo || bestActorData.photo.includes('Defaultpic.png'))) ||
                    (matchedActor.bio && (!bestActorData.bio || matchedActor.bio.length > bestActorData.bio.length)))
                {
                    bestActorData = matchedActor;
                }
            }
        }
    }

    if (bestActorData) {
        console.log(`Found data for '${actorName}' in movies. Creating new public profile.`);
        const newProfileData: ActorProfile = {
            name: bestActorData.name, // Use the name from data to preserve casing
            slug: actorSlug,
            bio: bestActorData.bio || 'Bio not available.',
            photo: bestActorData.photo || '',
            highResPhoto: bestActorData.highResPhoto || bestActorData.photo || '',
            imdbUrl: '', // Can be updated by the actor
        };
        
        await actorProfileRef.set(newProfileData);
        
        return new Response(JSON.stringify({ profile: newProfileData }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }
    
    // If we reach here, actor was not in profiles and not found in any movie cast.
    return new Response(JSON.stringify({ error: 'Actor profile not found. If you just signed up, your profile may still be generating. Try again in a minute.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error fetching actor profile:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}