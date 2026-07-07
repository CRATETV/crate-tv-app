
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

export async function POST(request: Request) {
  try {
    const { password, amount, reason } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    if (!amount || !reason || amount <= 0) {
        return new Response(JSON.stringify({ error: 'A valid amount and reason are required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const payoutData = {
        amount: Math.round(Number(amount) * 100),
        reason,
        payoutDate: FieldValue.serverTimestamp(),
    };
    const newPayoutRef = await db.collection('admin_payouts').add(payoutData);

    const bodyHtml = `
      <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Finance</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">Admin Payout Recorded</h1>
      <p style="margin:0 0 8px;"><strong>Amount:</strong> ${formatCurrency(payoutData.amount)}</p>
      <p style="margin:0;"><strong>Reason:</strong> ${reason}</p>
    `;

    await resend.emails.send({
        from: `Crate TV System <${fromEmail}>`,
        to: [adminEmail],
        subject: `Admin Payout Recorded: ${formatCurrency(payoutData.amount)}`,
        html: renderBrandedEmail({ title: `Admin Payout Recorded: ${formatCurrency(payoutData.amount)}`, bodyHtml }),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error processing admin payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
