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
        return new Response(JSON.stringify({ error: "User profile record incomplete." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
    }

    let profile: ActorProfile | null = null;
    let foundSlug: string | null = userData.actorProfileSlug || null;

    // 1. Fetch with existing slug
    if (foundSlug) {
        const profileDoc = await db.collection('actor_profiles').doc(foundSlug).get();
        if (profileDoc.exists) {
            profile = profileDoc.data() as ActorProfile;
        }
    }

    // 2. Fetch by name search
    if (!profile) {
        const profileQuery = await db.collection('actor_profiles').where('name', '==', userData.name).limit(1).get();
        if (!profileQuery.empty) {
            const profileDoc = profileQuery.docs[0];
            profile = profileDoc.data() as ActorProfile;
            foundSlug = profileDoc.id;
            await userRef.update({ actorProfileSlug: foundSlug });
        }
    }
    
    // 3. Last Resort: Backfill from movie credits
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
        
        const newSlug = slugify(userData.name);
        // FIX: Added missing 'email' property to newProfileData to satisfy the ActorProfile interface requirement.
        const newProfileData: ActorProfile = {
            name: userData.name,
            slug: newSlug,
            bio: bestActorData?.bio || 'Biography data pending synchronization.',
            photo: bestActorData?.photo || 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            highResPhoto: bestActorData?.highResPhoto || bestActorData?.photo || 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            imdbUrl: '',
            email: userData.email || '',
        };
        
        await db.collection('actor_profiles').doc(newSlug).set(newProfileData, { merge: true });
        await userRef.update({ actorProfileSlug: newSlug });
        profile = newProfileData;
    }
    
    return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error fetching actor profile:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}