import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com';

const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
    const ip = getIp(request);
    try {
        const { filmTitle, directorName, cast, email, synopsis, posterUrl, movieUrl } = await request.json();

        if (!filmTitle || !directorName || !cast || !email || !synopsis || !posterUrl || !movieUrl) {
            return new Response(JSON.stringify({ error: 'All fields, including poster and movie uploads, are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed. Could not process submission.");

        // Create an entry in the movie pipeline
        const pipelineEntry = {
            title: filmTitle,
            director: directorName,
            cast: cast,
            posterUrl,
            movieUrl,
            submitterEmail: email,
            synopsis,
            submissionDate: FieldValue.serverTimestamp(),
            status: 'pending'
        };
        await db.collection('movie_pipeline').add(pipelineEntry);
        
        // Log security event for submission
        await db.collection('security_events').add({
            type: 'FILM_SUBMISSION',
            ip,
            timestamp: FieldValue.serverTimestamp(),
            details: { filmTitle, directorName, email }
        });

        // Send an email notification to the admin
        const subject = `New Film Submission: "${filmTitle}"`;
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h1>New Film Submission in Pipeline</h1>
                <p>A new film has been submitted and is ready for review in the Admin Dashboard.</p>
                <ul>
                    <li><strong>Film Title:</strong> ${filmTitle}</li>
                    <li><strong>Director:</strong> ${directorName}</li>
                    <li><strong>Submitter Email:</strong> <a href="mailto:${email}">${email}</a></li>
                </ul>
                <p>You can review, approve, and add this film to a category from the "Submission Pipeline" tab in the admin panel.</p>
            </div>
        `;

        await resend.emails.send({
            from: `Crate TV Submissions <${fromEmail}>`,
            to: [adminEmail],
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