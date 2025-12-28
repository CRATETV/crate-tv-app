import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    const { directorName, password, amount, payoutMethod, payoutDetails } = await request.json();

    if (password !== 'cratedirector' || !directorName || !amount) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing params' }), { status: 401 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("DB fail");

    await db.collection('payout_requests').add({
        directorName,
        amount,
        payoutMethod,
        payoutDetails,
        status: 'pending',
        requestDate: FieldValue.serverTimestamp(),
    });

    const amountFormatted = `$${(amount / 100).toFixed(2)}`;
    await resend.emails.send({
        from: `Crate TV Payouts <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: `💰 Payout Request: ${directorName} (${amountFormatted})`,
        html: `<p><strong>Director:</strong> ${directorName}</p><p><strong>Amount:</strong> ${amountFormatted}</p><p><strong>Method:</strong> ${payoutMethod}</p><p><strong>Details:</strong> ${payoutDetails}</p>`,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Payout request error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}