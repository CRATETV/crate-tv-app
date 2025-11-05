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
             if(error.code === 'auth/email-already-exists') {
                throw new Error("This email is already associated with an account. Please use a different email or contact support.");
             }
            throw error;
        }
    }

    // --- Step 3: Set custom claim and Firestore profile (ROBUST METHOD) ---
    const userProfileDoc = await db.collection('users').doc(userRecord.uid).get();
    const existingProfileData = userProfileDoc.data();
    
    const newClaims = {
        isFilmmaker: true, // Granting filmmaker role now
        isActor: existingProfileData?.isActor === true // Preserve existing actor role
    };

    await auth.setCustomUserClaims(userRecord.uid, newClaims);
    
    await db.collection('users').doc(userRecord.uid).set({ 
        name, 
        email, 
        ...newClaims
    }, { merge: true });

    // --- Step 4: Generate password creation link ---
    const actionCodeSettings = {
        url: new URL('/portal', request.url).href,
        handleCodeInApp: false,
    };
    const link = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // --- Step 5: Send Email with Resend ---
    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Filmmaker Dashboard, ${name}!</h1>
        <p>We've verified your name in our records and created an account for you. To access your dashboard and view your film's performance, you first need to create a secure password.</p>
        <p>Click the link below to set your password:</p>
        <p><a href="${link}" style="color: #6d28d9; text-decoration: none; font-weight: bold;">Create Your Password</a></p>
        <p>This link is valid for a limited time. Once your password is set, you can log in to the Filmmaker Dashboard at any time.</p>
        <p>- The Crate TV Team</p>
      </div>
    `;
    
    const emailText = `
        Welcome to the Crate TV Filmmaker Dashboard, ${name}!\n\n
        We've verified your name in our records and created an account for you. To access your dashboard and view your film's performance, you first need to create a secure password.\n\n
        Copy and paste the following link into your browser to set your password:\n${link}\n\n
        This link is valid for a limited time.\n\n
        - The Crate TV Team
    `;

    const { error } = await resend.emails.send({
        from: `Crate TV <${fromEmail}>`,
        to: [email],
        subject: `Create Your Password for the Crate TV Filmmaker Dashboard`,
        html: emailHtml,
        text: emailText,
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