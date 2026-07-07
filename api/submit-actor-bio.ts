
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'studiocrate@gmail.com';

export async function POST(request: Request) {
  try {
    const { actorName, email, bio, photoUrl, highResPhotoUrl, imdbUrl } = await request.json();

    if (!actorName || !email || !bio || !photoUrl || !highResPhotoUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const submissionData = {
        actorName,
        email,
        bio,
        photoUrl,
        highResPhotoUrl,
        imdbUrl: imdbUrl || '',
        submissionDate: FieldValue.serverTimestamp(),
        status: 'pending',
    };

    await db.collection('actorSubmissions').add(submissionData);
    
    const bodyHtml = `
      <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">New Submission</p>
      <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;text-transform:uppercase;">Actor Profile: ${actorName}</h1>
      <p style="margin:0 0 8px;">A new actor profile is awaiting review.</p>
      <p style="margin:0 0 24px;"><strong>Email:</strong> ${email}</p>
      ${renderEmailButton('Review in Admin', 'https://cratetv.net/admin')}
    `;

    await resend.emails.send({
      from: `Crate TV Admin <${fromEmail}>`,
      to: adminEmail,
      subject: `New Actor Submission: ${actorName}`,
      html: renderBrandedEmail({ title: `New Actor Submission: ${actorName}`, bodyHtml }),
    });


    return new Response(JSON.stringify({ success: true, message: 'Submission received.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error submitting actor bio:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
