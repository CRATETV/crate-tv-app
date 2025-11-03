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
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }

    // --- Firebase Admin Init ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Database or Auth connection failed.");

    // --- Step 1: Verify actor name exists in movies DB ---
    const moviesSnapshot = await db.collection('movies').get();
    let foundActor: Actor | null = null;
    const trimmedName = name.trim().toLowerCase();

    for (const movieDoc of moviesSnapshot.docs) {
        const movieData = movieDoc.data() as Movie;
        if (movieData.cast && Array.isArray(movieData.cast)) {
            const actorInMovie = movieData.cast.find(actor => actor.name.trim().toLowerCase() === trimmedName);
            if (actorInMovie) {
                foundActor = actorInMovie;
                break; // Found our actor, no need to search further
            }
        }
    }

    if (!foundActor) {
      return new Response(JSON.stringify({ error: "Name not found in our film credits. Please ensure it matches exactly." }), { status: 404, headers: {'Content-Type': 'application/json'} });
    }
    
    // --- Step 2: Create or Find Firebase user ---
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email, displayName: name });
        } else {
            // Re-throw other auth errors, like email-already-in-use by a non-actor
             if(error.code === 'auth/email-already-exists') {
                throw new Error("This email is already associated with an account. Please use a different email or contact support.");
             }
            throw error;
        }
    }

    // --- Step 3: Set custom claim, Firestore profile, and Public Actor Profile ---
    await auth.setCustomUserClaims(userRecord.uid, { isActor: true });
    
    const userProfileRef = db.collection('users').doc(userRecord.uid);
    await userProfileRef.set({ name, email, isActor: true }, { merge: true });

    // Create the public-facing profile if it doesn't exist, seeded with data from the movie
    const actorSlug = slugify(name);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const existingProfile = await actorProfileRef.get();
    if (!existingProfile.exists) {
        const newProfile: ActorProfile = {
            name: foundActor.name,
            slug: actorSlug,
            bio: foundActor.bio || 'Bio not available.',
            photo: foundActor.photo,
            highResPhoto: foundActor.highResPhoto,
            imdbUrl: '', // Can be filled in later by the actor
        };
        await actorProfileRef.set(newProfile);
    }


    // --- Step 4: Generate password creation link ---
    const actionCodeSettings = {
        url: new URL('/actor-portal', request.url).href, // Redirect to portal after password set
        handleCodeInApp: false,
    };
    const link = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // --- Step 5: Send Email with Resend ---
    const portalUrl = new URL('/actor-portal', request.url).href;

    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Actor Portal, ${name}!</h1>
        <p>We've confirmed you're an actor on Crate TV. To access your private portal where you can update your profile and connect with other actors, you first need to create a secure password for your account.</p>
        <p>Click the link below to set your password:</p>
        <p><a href="${link}" style="color: #6d28d9; text-decoration: none; font-weight: bold;">Create Your Password</a></p>
        <p>This link is valid for a limited time. Once your password is set, you can log in at <a href="${portalUrl}">${portalUrl}</a>.</p>
        <p>We're excited to have you with us!</p>
        <p>- The Crate TV Team</p>
      </div>
    `;
    
    const emailText = `
        Welcome to the Crate TV Actor Portal, ${name}!\n\n
        We've confirmed you're an actor on Crate TV. To access your private portal where you can update your profile and connect with other actors, you first need to create a secure password for your account.\n\n
        Copy and paste the following link into your browser to set your password:\n${link}\n\n
        This link is valid for a limited time. Once your password is set, you can log in at ${portalUrl}.\n\n
        We're excited to have you with us!\n- The Crate TV Team
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

    return new Response(JSON.stringify({ success: true, message: 'Verification successful. Email sent.' }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error("Error in actor-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}