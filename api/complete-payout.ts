// This is a Vercel Serverless Function
// Path: /api/complete-payout
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
  try {
    const { requestId, password: __raw_password, action, declineReason } = await request.json();
    const password = await resolveAdminCredential(__raw_password);

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

    if (!requestId) {
        return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400 });
    }

    const requestRef = db.collection('payout_requests').doc(requestId);
    const existing = await requestRef.get();
    if (!existing.exists) {
        return new Response(JSON.stringify({ error: 'Payout request not found.' }), { status: 404 });
    }
    if (existing.data()?.status !== 'pending') {
        return new Response(JSON.stringify({ error: `This request is already ${existing.data()?.status}.` }), { status: 409 });
    }

    if (action === 'decline') {
        // Declined requests are kept (not deleted) so there's a record, and
        // they're never counted as money paid out.
        await requestRef.update({
            status: 'declined',
            declineReason: typeof declineReason === 'string' ? declineReason.slice(0, 1000) : '',
            completionDate: FieldValue.serverTimestamp()
        });
    } else {
        await requestRef.update({
            status: 'completed',
            completionDate: FieldValue.serverTimestamp()
        });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error completing payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}