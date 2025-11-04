// This is a Vercel Serverless Function
// It will be accessible at the path /api/actor-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, Actor, ActorProfile } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

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
    const { name, email } = await request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), { status: 400 });
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

    // This check now directly verifies if any actor data was found and acts as a type guard for TypeScript.
    if (!bestActorData) {
      return new Response(JSON.stringify({ error: 'Actor name not found in our records. Please ensure it matches the film credits exactly.' }), { status: 404 });
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
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email, displayName: name });
        } else {
            throw error; // Re-throw other auth errors
        }
    }

    // --- Step 3: Set custom claim and Firestore profile ---
    await auth.setCustomUserClaims(userRecord.uid, { isActor: true });
    const userProfileRef = db.collection('users').doc(userRecord.uid);
    await userProfileRef.set({ name, email, isActor: true }, { merge: true });

    // --- Step 4: Generate password creation link ---
    const actionCodeSettings = {
        url: new URL('/actor-portal', request.url).href,
        handleCodeInApp: false,
    };
    const link = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // --- Step 5: Send Email with Resend ---
    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Actor Portal, ${name}!</h1>
        <p>We've confirmed you're part of the Crate TV family. To access the portal and update your profile, you first need to create a secure password for your account.</p>
        <p>Click the link below to set your password:</p>
        <p><a href="${link}" style="color: #6d28d9; text-decoration: none; font-weight: bold;">Create Your Password</a></p>
        <p>This link is valid for a limited time. Once your password is set, you can log in to the Actor Portal at any time.</p>
        <p>We look forward to seeing your updates!</p>
        <p>- The Crate TV Team</p>
      </div>
    `;

    const emailText = `
        Welcome to the Crate TV Actor Portal, ${name}!\n\n
        We've confirmed you're part of the Crate TV family. To access the portal and update your profile, you first need to create a secure password for your account.\n\n
        Copy and paste the following link into your browser to set your password:\n${link}\n\n
        This link is valid for a limited time.\n\n
        - The Crate TV Team
    `;

    const { error } = await resend.emails.send({
        from: `Crate TV <${fromEmail}>`,
        to: [email],
        subject: `Create Your Password for the Crate TV Actor Portal`,
        html: emailHtml,
        text: emailText,
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error('Could not send the access email. Please try again later.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Verification successful. Email sent.' }), { status: 200 });

  } catch (error) {
    console.error("Error in actor-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}