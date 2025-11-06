import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY || 're_DB9YrhLH_PRYF6PESKVh3x1vXLJLrXsL6');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const toEmail = 'cratetiv@gmail.com';

const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
    const ip = getIp(request);
    try {
        const data = await request.json();
        const { filmTitle, directorName, email, synopsis, actorBio, awards, relevantInfo } = data;

        if (!filmTitle || !directorName || !email || !synopsis) {
            return new Response(JSON.stringify({ error: 'Missing required submission fields.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const subject = `New Film Submission: "${filmTitle}" by ${directorName}`;
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h1>New Film Submission Details</h1>
                <p><strong>Film Title:</strong> ${filmTitle}</p>
                <p><strong>Director:</strong> ${directorName}</p>
                <p><strong>Contact Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <hr />
                <h3>Synopsis</h3>
                <p>${synopsis}</p>
                <h3>Actor Bios</h3>
                <p>${actorBio || 'Not provided.'}</p>
                <h3>Awards & Recognition</h3>
                <p>${awards || 'Not provided.'}</p>
                <h3>Relevant Information</h3>
                <p>${relevantInfo || 'Not provided.'}</p>
            </div>
        `;

        await resend.emails.send({
            from: `Crate TV Submissions <${fromEmail}>`,
            to: [toEmail],
            reply_to: email,
            subject: subject,
            html: emailHtml
        });
        
        // Log submission event
        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('security_events').add({
                    type: 'SUBMISSION_SENT',
                    ip,
                    timestamp: FieldValue.serverTimestamp(),
                    details: { filmTitle, directorName, email, userAgent: request.headers.get('user-agent') }
                });
            }
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
