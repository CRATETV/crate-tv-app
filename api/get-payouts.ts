// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-payouts
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { PayoutRequest } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

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

    const payoutsSnapshot = await db.collection('payout_requests').orderBy('requestDate', 'desc').get();
    
    const payoutRequests: PayoutRequest[] = [];
    payoutsSnapshot.forEach(doc => {
        payoutRequests.push({ id: doc.id, ...doc.data() } as PayoutRequest);
    });

    return new Response(JSON.stringify({ payoutRequests }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error fetching payout requests:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
