// This is a Vercel Serverless Function
// It will be accessible at the path /api/actor-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

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

    // --- Step 1: Verify actor name exists in movies DB ---
    const moviesSnapshot = await db.collection('movies').get();
    let actorFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        if (movieData.cast && movieData.cast.some(actor => actor.name.trim().toLowerCase() === trimmedName)) {
            actorFound = true;
        }
    });

    if (!actorFound) {
      return new Response(JSON.stringify({ error: 'Actor name not found in our records. Please ensure it matches the film credits exactly.' }), { status: 404 });
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