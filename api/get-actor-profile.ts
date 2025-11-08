// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-actor-profile
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, Actor, ActorProfile } from '../types.js';

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

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userDoc.exists || !userData || !userData.name) {
        return new Response(JSON.stringify({ error: "Your user profile could not be found or is incomplete. Please contact support." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
    }

    let profile: ActorProfile | null = null;
    let foundSlug: string | null = userData.actorProfileSlug || null;

    // 1. Try to fetch with existing slug
    if (foundSlug) {
        const profileDoc = await db.collection('actor_profiles').doc(foundSlug).get();
        if (profileDoc.exists) {
            profile = profileDoc.data() as ActorProfile;
        }
    }

    // 2. If not found via slug, try to find by name (handles name changes)
    if (!profile) {
        const profileQuery = await db.collection('actor_profiles').where('name', '==', userData.name).limit(1).get();
        if (!profileQuery.empty) {
            const profileDoc = profileQuery.docs[0];
            profile = profileDoc.data() as ActorProfile;
            foundSlug = profileDoc.id;
            // Write back the correct slug to the user profile for future efficiency
            await userRef.update({ actorProfileSlug: foundSlug });
        }
    }
    
    // 3. If still not found, try to generate from movie data
    if (!profile) {
        const moviesSnapshot = await db.collection('movies').get();
        let bestActorData: Actor | null = null;
        const trimmedName = userData.name.trim().toLowerCase();

        for (const movieDoc of moviesSnapshot.docs) {
            const movieData = movieDoc.data() as Movie;
            if (movieData.cast) {
                const matchedActor = movieData.cast.find(actor => actor.name.trim().toLowerCase() === trimmedName);
                if (matchedActor) {
                    if (!bestActorData || (matchedActor.photo && !matchedActor.photo.includes('Defaultpic')) || (matchedActor.bio && matchedActor.bio.length > (bestActorData.bio || '').length)) {
                        bestActorData = matchedActor;
                    }
                }
            }
        }
        
        if (bestActorData) {
            const newSlug = slugify(bestActorData.name);
            const newProfileData: ActorProfile = {
                name: bestActorData.name,
                slug: newSlug,
                bio: bestActorData.bio || 'Bio not available.',
                photo: bestActorData.photo || '',
                highResPhoto: bestActorData.highResPhoto || bestActorData.photo || '',
                imdbUrl: '',
            };
            
            // Save the new profile and update the user doc with the new slug
            await db.collection('actor_profiles').doc(newSlug).set(newProfileData);
            await userRef.update({ actorProfileSlug: newSlug });
            
            profile = newProfileData;
            foundSlug = newSlug;
        }
    }
    
    // 4. Return result or error
    if (profile) {
        return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } else {
        return new Response(JSON.stringify({ error: 'Actor profile not found. If you just signed up, your profile may still be generating. Try again in a minute.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error("Error fetching actor profile:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}