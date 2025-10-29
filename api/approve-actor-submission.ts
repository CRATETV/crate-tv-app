// This is a Vercel Serverless Function
// It will be accessible at the path /api/approve-actor-submission
import * as admin from 'firebase-admin';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.ts';
import { Movie, ActorProfile } from '../types.ts';

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
    const { submissionId, password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    } else {
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }
    const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    if (!anyPasswordSet) isAuthenticated = true;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    
    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) throw new Error("Submission not found.");
    const submissionData = submissionDoc.data();
    if (!submissionData) throw new Error("Submission data is empty.");

    const { actorName, bio, photoUrl, highResPhotoUrl, imdbUrl } = submissionData;
    
    const batch = db.batch();

    // 1. Create or Update the public actor profile
    const actorSlug = slugify(actorName);
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileData: ActorProfile = {
        name: actorName,
        slug: actorSlug,
        bio: bio,
        photo: photoUrl,
        highResPhoto: highResPhotoUrl,
        imdbUrl: imdbUrl || '',
    };
    batch.set(actorProfileRef, actorProfileData, { merge: true });

    // 2. Find all movies this actor is in and update their details
    const moviesSnapshot = await db.collection('movies').get();
    moviesSnapshot.forEach(doc => {
        const movie = doc.data() as Movie;
        if (Array.isArray(movie.cast)) {
            let castUpdated = false;
            const updatedCast = movie.cast.map(actor => {
                if (actor.name === actorName) {
                    castUpdated = true;
                    // Update with new data from submission
                    return { ...actor, bio, photo: photoUrl, highResPhoto: highResPhotoUrl };
                }
                return actor;
            });

            if (castUpdated) {
                batch.update(doc.ref, { cast: updatedCast });
            }
        }
    });

    // 3. Mark the submission as approved
    batch.update(submissionRef, { status: 'approved' });

    // 4. Commit all batch operations
    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: 'Submission approved and all profiles updated.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error approving submission:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}