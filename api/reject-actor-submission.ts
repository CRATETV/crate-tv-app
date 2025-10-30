// This is a Vercel Serverless Function
// It will be accessible at the path /api/reject-actor-submission
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
  try {
    const { submissionId, password, reason } = await request.json();

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
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const submissionRef = db.collection('actorSubmissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) {
        throw new Error('Submission not found.');
    }
    const submissionData = submissionDoc.data();

    // --- Send Rejection Email if reason is provided ---
    if (reason && submissionData && submissionData.email) {
        const emailHtml = `
            <div>
                <h1>Update on your Crate TV Profile Submission</h1>
                <p>Hello ${submissionData.actorName},</p>
                <p>Thank you for submitting your profile update. After careful review, we have decided not to approve this submission at this time. Here is the feedback from our team:</p>
                <div style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 1rem; margin: 1rem 0;">
                    <p style="margin: 0;"><em>${reason.replace(/\n/g, '<br>')}</em></p>
                </div>
                <p>We appreciate your contribution and encourage you to make the suggested changes and resubmit your profile through the Actor Portal. We value having you in our community!</p>
                <p>Sincerely,</p>
                <p>The Crate TV Team</p>
            </div>
        `;

        await resend.emails.send({
            from: `Crate TV <${fromEmail}>`,
            to: [submissionData.email],
            subject: 'An Update on Your Crate TV Profile Submission',
            html: emailHtml,
        });
    }
    
    // --- Update Submission Status ---
    await submissionRef.update({ 
        status: 'rejected',
        rejectionReason: reason || 'No reason provided.' 
    });

    return new Response(JSON.stringify({ success: true, message: 'Submission rejected successfully.' }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error rejecting submission:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}