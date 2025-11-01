// This is a Vercel Serverless Function
// Path: /api/filmmaker-signup
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

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
    try {
        userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({ email, displayName: name });
        } else {
            // Re-throw other auth errors, like email-already-in-use by a non-filmmaker
             if(error.code === 'auth/email-already-exists') {
                throw new Error("This email is already associated with an account. Please use a different email or contact support.");
             }
            throw error;
        }
    }

    // --- Step 3: Set custom claim and Firestore profile ---
    await auth.setCustomUserClaims(userRecord.uid, { isFilmmaker: true });
    const userProfileRef = db.collection('users').doc(userRecord.uid);
    await userProfileRef.set({ name, email, isFilmmaker: true }, { merge: true });

    // --- Step 4: Generate password creation link ---
    const actionCodeSettings = {
        url: new URL('/filmmaker-dashboard', request.url).href, // Redirect to portal after password set
        handleCodeInApp: false,
    };
    const link = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // --- Step 5: Send Email with Resend ---
    const portalUrl = new URL('/filmmaker-dashboard', request.url).href;

    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Filmmaker Dashboard, ${name}!</h1>
        <p>We've confirmed you're a director or producer on Crate TV. To access your private analytics dashboard, you first need to create a secure password for your account.</p>
        <p>Click the link below to set your password:</p>
        <p><a href="${link}" style="color: #6d28d9; text-decoration: none; font-weight: bold;">Create Your Password</a></p>
        <p>This link is valid for a limited time. Once your password is set, you can log in at <a href="${portalUrl}">${portalUrl}</a>.</p>
        <p>We're excited to have you with us!</p>
        <p>- The Crate TV Team</p>
      </div>
    `;

    const { error } = await resend.emails.send({
        from: `Crate TV <${fromEmail}>`,
        to: [email],
        subject: `Create Your Password for the Crate TV Filmmaker Dashboard`,
        html: emailHtml,
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error('Could not send the access email. Please try again later.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Verification successful. Email sent.' }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error("Error in filmmaker-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}