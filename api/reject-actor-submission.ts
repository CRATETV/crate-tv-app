// This is a Vercel Serverless Function
// It will be accessible at the path /api/reject-actor-submission
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';

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
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    
    await submissionRef.update({ status: 'rejected' });

    return new Response(JSON.stringify({ success: true, message: 'Submission rejected successfully.' }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error rejecting submission:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
