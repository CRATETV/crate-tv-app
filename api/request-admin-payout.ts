// This is a Vercel Serverless Function
// Path: /api/request-admin-payout
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

export async function POST(request: Request) {
  try {
    const { password, amount, reason } = await request.json();

    // --- Authentication ---
    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    if (!amount || !reason || amount <= 0) {
        return new Response(JSON.stringify({ error: 'A valid amount and reason are required.' }), { status: 400 });
    }

    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const payoutData = {
        amount: Math.round(Number(amount) * 100), // Store in cents
        reason,
        payoutDate: FieldValue.serverTimestamp(),
    };
    const newPayoutRef = await db.collection('admin_payouts').add(payoutData);

    // --- Send Notification Email ---
    const emailHtml = `
      <div>
        <h1>Admin Payout Recorded</h1>
        <p>A new payout to the admin has been recorded in the Crate TV system.</p>
        <ul>
          <li><strong>Amount:</strong> ${formatCurrency(payoutData.amount)}</li>
          <li><strong>Reason:</strong> ${reason}</li>
          <li><strong>Transaction ID:</strong> ${newPayoutRef.id}</li>
        </ul>
      </div>
    `;
    
    await resend.emails.send({
        from: `Crate TV System <${fromEmail}>`,
        to: [adminEmail],
        subject: `Admin Payout Recorded: ${formatCurrency(payoutData.amount)}`,
        html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true, newPayout: { id: newPayoutRef.id, ...payoutData } }), { status: 200 });

  } catch (error) {
    console.error("Error processing admin payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}