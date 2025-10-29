// This is a Vercel Serverless Function
// Path: /api/filmmaker-signup
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.ts';
import { Movie } from '../types.ts';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const portalPassword = 'cratedirector';

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required.' }), { status: 400, headers: {'Content-Type': 'application/json'} });
    }

    // --- Validate director name against Firestore ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const moviesSnapshot = await db.collection('movies').get();
    let directorFound = false;
    const trimmedName = name.trim().toLowerCase();

    moviesSnapshot.forEach(movieDoc => {
        const movieData = movieDoc.data() as Movie;
        const directors = (movieData.director || '').split(',').map(d => d.trim().toLowerCase());
        if (directors.includes(trimmedName)) {
            directorFound = true;
        }
    });

    if (!directorFound) {
      return new Response(JSON.stringify({ error: 'Director name not found in our records. Please ensure it matches the film credits exactly.' }), { status: 404, headers: {'Content-Type': 'application/json'} });
    }
    
    // --- Send Email with Resend ---
    const portalUrl = new URL('/filmmaker-portal', request.url).href;

    const emailHtml = `
      <div>
        <h1>Welcome to the Crate TV Filmmaker Dashboard, ${name}!</h1>
        <p>We've confirmed you're a director on Crate TV. You can now access your private dashboard to view your film's analytics and manage earnings.</p>
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
        subject: `Your Crate TV Filmmaker Dashboard Access`,
        html: emailHtml,
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error('Could not send the access email. Please try again later.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Verification successful. Email sent.' }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error("Error in filmmaker-signup API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}
