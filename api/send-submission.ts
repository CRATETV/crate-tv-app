import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';


const resend = new Resend(process.env.RESEND_API_KEY || 're_DB9YrhLH_PRYF6PESKVh3x1vXLJLrXsL6');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const toEmail = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const { filmTitle, directorName, email, synopsis, actorBio, awards, relevantInfo } = await request.json();

        if (!filmTitle || !directorName || !email || !synopsis) {
            return new Response(JSON.stringify({ error: 'Film Title, Director Name, Email, and Synopsis are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const subject = `New Film Submission: "${filmTitle}"`;
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h1>New Film Submission via Crate TV</h1>
                <p><strong>Film Title:</strong> ${filmTitle}</p>
                <p><strong>Director:</strong> ${directorName}</p>
                <p><strong>Submitter Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <h2>Synopsis</h2>
                <p style="white-space: pre-wrap;">${synopsis}</p>
                <h2>Actor Bios</h2>
                <p style="white-space: pre-wrap;">${actorBio || 'Not provided.'}</p>
                <h2>Awards & Recognition</h2>
                <p style="white-space: pre-wrap;">${awards || 'Not provided.'}</p>
                <h2>Relevant Information</h2>
                <p style="white-space: pre-wrap;">${relevantInfo || 'Not provided.'}</p>
            </div>
        `;
        
        // Log submission to a 'submissions' collection
        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('film_submissions').add({
                    filmTitle,
                    directorName,
                    email,
                    synopsis,
                    actorBio,
                    awards,
                    relevantInfo,
                    submissionDate: FieldValue.serverTimestamp(),
                    status: 'pending'
                });
            }
        }

        await resend.emails.send({
            from: `Crate TV Submissions <${fromEmail}>`,
            to: [toEmail],
            reply_to: email,
            subject: subject,
            html: emailHtml
        });
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Submission error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
