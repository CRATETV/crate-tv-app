import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, ActorProfile } from '../types.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { bio, photoUrl, highResPhotoUrl, imdbUrl, isAvailableForCasting } = await request.json();
    
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

    if (!bio || !photoUrl || !highResPhotoUrl) {
      return new Response(JSON.stringify({ error: 'Missing required profile data.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
        return new Response(JSON.stringify({ error: "Your user profile could not be found to apply updates." }), { status: 404, headers: { 'Content-Type': 'application/json' }});
    }
    const actorName = userDoc.data()!.name;

    const batch = db.batch();

    // Step 1: Update the public actor profile document
    const actorSlug = slugify(actorName);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileUpdate: Partial<ActorProfile> = {
        bio,
        photo: photoUrl,
        highResPhoto: highResPhotoUrl,
        imdbUrl: imdbUrl || '',
        isAvailableForCasting: isAvailableForCasting === true,
    };
    batch.set(actorProfileRef, actorProfileUpdate, { merge: true });

    // Step 2: Update the actor's info across all movies
    const moviesSnapshot = await db.collection('movies').get();
    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        let actorFound = false;

        const updatedCast = movieData.cast.map(actor => {
            if (actor.name.trim().toLowerCase() === actorName.trim().toLowerCase()) {
                actorFound = true;
                return {
                    ...actor,
                    bio,
                    photo: photoUrl,
                    highResPhoto: highResPhotoUrl,
                    isAvailableForCasting: isAvailableForCasting === true,
                };
            }
            return actor;
        });

        if (actorFound) {
            batch.update(movieDoc.ref, { cast: updatedCast });
        }
    });

    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: 'Profile updated successfully across the platform.' }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (error) {
    console.error("Error updating actor profile:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}