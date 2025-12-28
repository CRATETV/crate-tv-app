import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
  try {
    const { submissionId, password, reason } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const db = getAdminDb();
    if (!db) throw new Error("DB fail");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) throw new Error("Not found");
    const data = submissionDoc.data()!;

    if (reason && data.email) {
        await resend.emails.send({
            from: `Crate TV <${FROM_EMAIL}>`,
            to: [data.email],
            subject: 'Update on your Crate TV Submission',
            html: `<p>Hello ${data.actorName},</p><p>We have decisions for your submission:</p><p><em>${reason}</em></p>`,
        });
    }
    
    await submissionRef.update({ status: 'rejected', rejectionReason: reason });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Rejection API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500 });
  }
}