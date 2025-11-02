// This is a Vercel Serverless Function
// Path: /api/manage-bill-savings
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { password, type, amount, reason } = await request.json();

    // --- Authentication ---
    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    // --- Validation ---
    if (!type || (type !== 'deposit' && type !== 'withdrawal')) {
        return new Response(JSON.stringify({ error: "Invalid transaction type. Must be 'deposit' or 'withdrawal'." }), { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return new Response(JSON.stringify({ error: 'A valid, positive amount is required.' }), { status: 400 });
    }
     if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return new Response(JSON.stringify({ error: 'A reason for the transaction is required.' }), { status: 400 });
    }


    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const transactionData = {
        type,
        amount: Math.round(Number(amount) * 100), // Store in cents
        reason: reason.trim(),
        transactionDate: FieldValue.serverTimestamp(),
    };

    const newTransactionRef = await db.collection('bill_savings_transactions').add(transactionData);

    return new Response(JSON.stringify({ success: true, transactionId: newTransactionRef.id }), { status: 201 });

  } catch (error) {
    console.error("Error managing bill savings:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}