// This is a Vercel Serverless Function
// Path: /api/request-payout
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

export async function POST(request: Request) {
  try {
    const { directorName, password, amount, payoutMethod, payoutDetails } = await request.json();

    if (password !== 'cratedirector' || !directorName || !amount || !payoutMethod || !payoutDetails) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing parameters.' }), { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Log the request in Firestore
    const requestData = {
        directorName,
        amount,
        payoutMethod,
        payoutDetails,
        status: 'pending',
        requestDate: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('payout_requests').add(requestData);

    // Send notification email to admin
    const emailHtml = `
      <div>
        <h1>New Payout Request</h1>
        <p>A filmmaker has requested a payout for their earnings.</p>
        <ul>
          <li><strong>Director:</strong> ${directorName}</li>
          <li><strong>Amount:</strong> ${formatCurrency(amount)}</li>
          <li><strong>Method:</strong> ${payoutMethod}</li>
          <li><strong>Details:</strong> ${payoutDetails}</li>
        </ul>
        <p>Please process this payment and then mark it as complete in the Crate TV Admin Dashboard.</p>
      </div>
    `;
    
    await resend.emails.send({
        from: `Crate TV Payouts <${fromEmail}>`,
        to: [adminEmail],
        subject: `Payout Request from ${directorName} for ${formatCurrency(amount)}`,
        html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error processing payout request:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}