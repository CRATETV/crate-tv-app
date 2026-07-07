import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';

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
        const bodyHtml = `
            <p style="margin:0 0 20px;">Hello ${data.actorName},</p>
            <p style="margin:0 0 20px;">Thank you for submitting your profile to Crate TV. After review, we're not able to move forward with it at this time:</p>
            <div style="background-color:#f4f4f4;border-left:3px solid #ef4444;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 28px;font-style:italic;color:#555555;">${reason}</div>
            <p style="margin:0;font-size:13px;color:#666666;">We appreciate your interest in Crate TV and hope you'll consider submitting again in the future.</p>
        `;
        await resend.emails.send({
            from: `Crate TV <${FROM_EMAIL}>`,
            to: [data.email],
            subject: 'Update on your Crate TV Submission',
            html: renderBrandedEmail({ title: 'Update on your Crate TV Submission', bodyHtml }),
        });
    }
    
    await submissionRef.update({ status: 'rejected', rejectionReason: reason });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Rejection API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500 });
  }
}