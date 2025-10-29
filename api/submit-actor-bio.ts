// This is a Vercel Serverless Function
// It will be accessible at the path /api/submit-actor-bio
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.ts';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { actorName, email, bio, photoUrl, highResPhotoUrl, imdbUrl } = await request.json();

    if (!actorName || !email || !bio || !photoUrl || !highResPhotoUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const submissionData = {
        actorName,
        email,
        bio,
        photoUrl,
        highResPhotoUrl,
        imdbUrl: imdbUrl || '',
        submissionDate: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
    };

    await db.collection('actorSubmissions').add(submissionData);

    return new Response(JSON.stringify({ success: true, message: 'Submission received.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error submitting actor bio:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
