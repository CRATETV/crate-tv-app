import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, ActorProfile } from '../types.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { actorName, password, bio, photoUrl, highResPhotoUrl, imdbUrl } = await request.json();

    if (password !== 'cratebio') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (!actorName || !bio || !photoUrl || !highResPhotoUrl) {
      return new Response(JSON.stringify({ error: 'Missing required profile data.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const batch = db.batch();

    // Step 1: Update the public actor profile document
    const actorSlug = slugify(actorName);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileUpdate: Partial<ActorProfile> = {
        bio,
        photo: photoUrl,
        highResPhoto: highResPhotoUrl,
        imdbUrl: imdbUrl || '',
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
                    highResPhoto: highResPhotoUrl
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