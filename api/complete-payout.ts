// This is a Vercel Serverless Function
// Path: /api/complete-payout
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveAdminCredential } from './_lib/adminSession.js';
import { BOOKKEEPING_COLLECTION, TAX_DOCS_COLLECTION, PAYOUT_ENTRY_PREFIX, entryFromPayout, payeeKey } from './_lib/bookkeeping.js';

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
        // Bookkeeping: every completed payout is written to the ledger (once; same id every time).
        try {
            const data = existing.data() || {};
            const entry = entryFromPayout(requestId, data, new Date().toISOString());
            if (entry.amountCents > 0) {
                await db.collection(BOOKKEEPING_COLLECTION).doc(`${PAYOUT_ENTRY_PREFIX}${requestId}`).set({ ...entry, createdAt: FieldValue.serverTimestamp() });
            }
            const tax = (await db.collection(TAX_DOCS_COLLECTION).doc(payeeKey(entry.payee).replace(/\//g, '-')).get()).data();
            return new Response(JSON.stringify({ success: true, payee: entry.payee, w9: tax?.w9 || 'none' }), { status: 200 });
        } catch (e) { console.error('[complete-payout] bookkeeping entry failed:', e); }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error completing payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}