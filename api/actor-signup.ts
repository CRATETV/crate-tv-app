// This is a Vercel Serverless Function
// It will be accessible at the path /api/actor-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, Actor, ActorProfile } from '../types.js';

// List of creators who should automatically get both Actor and Filmmaker roles.
const DUAL_ROLE_NAMES = new Set([
    'salome denoon',
    'michael dwayne paylor',
    'michelle reale-opalesky',
    'darrah lashley',
    'bubacarr sarge',
    'joshua daniel'
]);

// Helper to create a URL-friendly slug from a name
const slugify = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // collapse whitespace and replace with -
        .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
};


export async function POST(request: Request) {
  try {
    const { name, email, password, bio, photoUrl, highResPhotoUrl, imdbUrl } = await request.json();

    if (!name || !email || !password || !bio || !photoUrl || !highResPhotoUrl) {
      return new Response(JSON.stringify({ error: 'All fields, including photos, are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }
     if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }

    // --- Firebase Admin Init ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Database or Auth connection failed.");

    // --- Create or Find Firebase user ---
    let userRecord;
    let userExists = false;
    try {
        userRecord = await auth.getUserByEmail(email);
        userExists = true;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email, password, displayName: name });
        } else {
             if (error.code === 'auth/email-already-exists') {
                throw new Error('This email is already in use. Please log in or use a different email.');
            }
            throw error;
        }
    }

    const trimmedName = name.trim();
    const batch = db.batch();

    // --- Set custom claim and Firestore user profile ---
    const isDualRole = DUAL_ROLE_NAMES.has(trimmedName.toLowerCase());
    const existingClaims = userRecord.customClaims || {};
    
    const newClaims = {
        isActor: true,
        isFilmmaker: existingClaims.isFilmmaker === true || isDualRole,
    };

    await auth.setCustomUserClaims(userRecord.uid, newClaims);
    
    const actorSlug = slugify(trimmedName);
    const userProfileRef = db.collection('users').doc(userRecord.uid);
    batch.set(userProfileRef, { 
        name: trimmedName, 
        email, 
        actorProfileSlug: actorSlug,
        ...newClaims
    }, { merge: true });

    // --- Create/Update the public actor profile ---
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileData: ActorProfile = {
        name: trimmedName,
        slug: actorSlug,
        bio,
        photo: photoUrl,
        highResPhoto: highResPhotoUrl,
        imdbUrl: imdbUrl || '',
    };
    batch.set(actorProfileRef, actorProfileData, { merge: true });

    // --- Update the actor's info across all movies they appear in ---
    const moviesSnapshot = await db.collection('movies').get();
    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        const cast = movieData.cast;
        let actorFound = false;

        const updatedCast = cast.map(actor => {
            if (actor.name.trim().toLowerCase() === trimmedName.toLowerCase()) {
                actorFound = true;
                return { ...actor, bio, photo: photoUrl, highResPhoto: highResPhotoUrl };
            }
            return actor;
        });

        if (actorFound) {
            batch.update(movieDoc.ref, { cast: updatedCast });
        }
    });

    await batch.commit();

    // --- Return success message ---
    if (userExists) {
        return new Response(JSON.stringify({
            success: true,
            message: 'An account with this email already exists. We have activated the Actor Portal for you and updated your profile.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    } else {
        return new Response(JSON.stringify({
            success: true,
            message: 'Your account has been created and your public profile is now live.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

  } catch (error) {
    console.error("Error in actor-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}