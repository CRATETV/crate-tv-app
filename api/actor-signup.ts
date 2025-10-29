// This is a Vercel Serverless Function
// It will be accessible at the path /api/actor-signup
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { Movie } from '../types';
import { Resend } from 'resend';

const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const portalPassword = 'cratebio';

export async function POST(request: Request) {
  try {
    // --- Configuration & Client Initialization ---
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        throw new Error("Server is not configured for sending emails: RESEND_API_KEY is missing.");
    }
    const resend = new Resend(resendApiKey);

    const { name, email } = await request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }

    // --- Validate actor name against Firestore ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const moviesSnapshot = await db.collection('movies').get();
    let actorFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        // If actor is already found, no need to continue iterating.
        if (actorFound) return;

        const movieData = movieDoc.data() as Movie;
        // Robust check: ensure cast is an array before trying to iterate.
        if (Array.isArray(movieData.cast)) {
            if (movieData.cast.some(actor => 
                // ensure actor object exists, has a name property, and it's a string
                actor && typeof actor.name === 'string' && actor.name.trim().toLowerCase() === trimmedName
            )) {
                actorFound = true;
            }
        }
    });

    if (!actorFound) {
      return new Response(JSON.stringify({ error: 'Actor name not found in our records. Please ensure it matches the film credits exactly.' }), { status: 404, headers: {'Content-Type': 'application/json'} });
    }
    
    // --- Send Email with Resend ---
    const portalUrl = new URL('/actor-portal', request.url).href;

    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Actor Portal, ${name}!</h1>
        <p>We've confirmed you're part of the Crate TV family. You can now update your bio and photos through our private portal.</p>
        <p>Please use the credentials below to log in:</p>
        <ul>
          <li><strong>Portal Login Page:</strong> <a href="${portalUrl}">${portalUrl}</a></li>
          <li><strong>Password:</strong> ${portalPassword}</li>
        </ul>
        <p>We're excited to have you with us!</p>
        <p>- The Crate TV Team</p>
      </div>
    `;

    const { error } = await resend.emails.send({
        from: `Crate TV <${fromEmail}>`,
        to: [email],
        subject: `Your Crate TV Actor Portal Access`,
        html: emailHtml,
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