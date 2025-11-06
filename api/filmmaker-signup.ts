// This is a Vercel Serverless Function
// Path: /api/filmmaker-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
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

    // --- Step 1: Verify filmmaker name exists in movies DB ---
    const moviesSnapshot = await db.collection('movies').get();
    let personFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        const directors = (movieData.director || '').split(',').map(d => d.trim().toLowerCase());
        const producers = (movieData.producers || '').split(',').map(p => p.trim().toLowerCase());
        
        if (directors.includes(trimmedName) || producers.includes(trimmedName)) {
            personFound = true;
        }
    });

    if (!personFound) {
      return new Response(JSON.stringify({ error: "Name not found in our records as a director or producer. Please ensure it matches the film credits exactly." }), { status: 404, headers: {'Content-Type': 'application/json'} });
    }
    
    // --- Step 2: Create or Find Firebase user ---
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

    // --- Step 3: Set custom claim and Firestore profile (ROBUST METHOD) ---
    const userProfileDoc = await db.collection('users').doc(userRecord.uid).get();
    const existingProfileData = userProfileDoc.data();
    
    const isDualRole = DUAL_ROLE_NAMES.has(trimmedName);

    const newClaims = {
        isFilmmaker: true, // Granting filmmaker role now
        isActor: existingProfileData?.isActor === true || isDualRole // Preserve existing actor role or grant if on the list
    };
    
    await auth.setCustomUserClaims(userRecord.uid, newClaims);
    
    await db.collection('users').doc(userRecord.uid).set({ 
        name, 
        email, 
        ...newClaims
    }, { merge: true });

    // --- Step 4: Return response ---
    if (userExists) {
        return new Response(JSON.stringify({
            success: true,
            message: 'An account with this email already exists. We have activated the Filmmaker Dashboard for you.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    } else {
        return new Response(JSON.stringify({
            success: true,
            message: 'Your account has been created and the Filmmaker Dashboard is now active.'
        }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

  } catch (error) {
    console.error("Error in filmmaker-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}