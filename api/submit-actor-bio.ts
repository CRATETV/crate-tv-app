
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

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
    
    const emailHtml = `
      <div>
        <h1>New Actor Profile Submission</h1>
        <p>A new actor profile for <strong>${actorName}</strong> is awaiting review.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Review at: cratetv.net/admin</p>
      </div>
    `;
    
    await resend.emails.send({
      from: `Crate TV Admin <${fromEmail}>`,
      to: adminEmail,
      subject: `New Actor Submission: ${actorName}`,
      html: emailHtml,
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
