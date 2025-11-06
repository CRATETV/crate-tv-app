// This is a Vercel Serverless Function
// It will be accessible at the path /api/actor-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, Actor, ActorProfile } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

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
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Name, email, and password are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
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

    // --- Step 1: Verify actor name exists in movies DB and find their best data ---
    const moviesSnapshot = await db.collection('movies').get();
    let bestActorData: Actor | null = null;
    const trimmedName = name.trim().toLowerCase();

    // Refactored to a for...of loop for more reliable type inference by the TS compiler.
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
    
    // If actor is not found in any films, create a default profile for them to sign up with.
    if (!bestActorData) {
        console.log(`Actor '${name}' not found in films. Creating a new default profile for signup.`);
        bestActorData = {
            name: name.trim(), // Use the name they provided
            bio: 'Welcome to Crate TV! Update your bio in the Actor Portal.',
            photo: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
            highResPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'
        };
    }
    
    // --- Step 1.5: Create public profile from best data if it doesn't exist ---
    const actorSlug = slugify(name);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileDoc = await actorProfileRef.get();

    if (!actorProfileDoc.exists) {
        const actorProfileData: ActorProfile = {
            name: bestActorData.name,
            slug: actorSlug,
            bio: bestActorData.bio || 'Bio not available.',
            photo: bestActorData.photo || '',
            highResPhoto: bestActorData.highResPhoto || bestActorData.photo || '',
            imdbUrl: '', // Can be updated later by the actor
        };
        await actorProfileRef.set(actorProfileData);
    }

    // --- Step 2: Create or Find Firebase user ---
    let userRecord;
    let userExists = false; // Flag to track if user was created or found
    try {
        userRecord = await auth.getUserByEmail(email);
        userExists = true;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, create them with the provided password
            userRecord = await auth.createUser({ email, password, displayName: name });
        } else {
            // Rethrow other unexpected errors from getUserByEmail, like 'auth/email-already-exists' from another provider
             if (error.code === 'auth/email-already-exists') {
                throw new Error('This email is already in use. Please log in or use a different email.');
            }
            throw error;
        }
    }

    // --- Step 3: Set custom claim and Firestore profile (ROBUST METHOD) ---
    const isDualRole = DUAL_ROLE_NAMES.has(trimmedName);
    const existingClaims = userRecord.customClaims || {};
    
    // Combine existing roles with the new role being granted
    const newClaims = {
        isActor: true, // Always grant actor role on this endpoint
        isFilmmaker: existingClaims.isFilmmaker === true || isDualRole,
    };

    // Set the custom claims on the Auth user.
    await auth.setCustomUserClaims(userRecord.uid, newClaims);
    
    // Update the user's document in Firestore with the merged roles.
    await db.collection('users').doc(userRecord.uid).set({ 
        name: bestActorData.name, 
        email, 
        ...newClaims
    }, { merge: true });

    // --- Step 4: Return success message ---
    if (userExists) {
        return new Response(JSON.stringify({
            success: true,
            message: 'An account with this email already exists. We have activated the Actor Portal for you.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    } else {
        return new Response(JSON.stringify({
            success: true,
            message: 'Your account has been created and the Actor Portal is now active.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

  } catch (error) {
    console.error("Error in actor-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}