import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const { filmTitle, directorName, cast, email, synopsis, posterUrl, movieUrl, musicRightsConfirmation } = await request.json();

        if (!filmTitle || !directorName || !cast || !synopsis || !posterUrl || !movieUrl) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const pipelineEntry = {
            title: filmTitle,
            director: directorName,
            cast: cast,
            posterUrl,
            movieUrl,
            submitterEmail: email || '',
            synopsis,
            submissionDate: FieldValue.serverTimestamp(),
            status: 'pending',
            musicRightsConfirmation: true
        };
        await db.collection('movie_pipeline').add(pipelineEntry);

        // --- Email Notification ---
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #ef4444;">New Submission Ready</h1>
                <p><strong>Film:</strong> ${filmTitle}</p>
                <p><strong>Director:</strong> ${directorName}</p>
                <p><strong>Contact:</strong> ${email || 'N/A'}</p>
                <p><strong>Synopsis:</strong> ${synopsis}</p>
                <div style="margin-top: 20px; text-align: center;">
                    <a href="https://cratetv.net/admin" style="background-color: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review in Dashboard</a>
                </div>
            </div>
        `;
        
        try {
            await resend.emails.send({
                from: `Crate TV Pipeline <${FROM_EMAIL}>`,
                to: [ADMIN_EMAIL],
                subject: `🎬 New Submission: ${filmTitle}`,
                html: emailHtml,
                reply_to: email || ADMIN_EMAIL
            });
        } catch (e) {
            console.warn("[Resend Warning] Pipeline notification failed. Check API Key/Domain:", e);
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Submission API Error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}