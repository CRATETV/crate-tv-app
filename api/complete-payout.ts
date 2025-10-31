// This is a Vercel Serverless Function
// Path: /api/complete-payout
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.ts';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { requestId, password } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const requestRef = db.collection('payout_requests').doc(requestId);
    
    await requestRef.update({
        status: 'completed',
        completionDate: admin.firestore.FieldValue.serverTimestamp()
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error completing payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}