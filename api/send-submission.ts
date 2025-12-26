import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
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
        const { filmTitle, directorName, cast, email, synopsis, posterUrl, movieUrl, musicRightsConfirmation } = await request.json();

        if (!filmTitle || !directorName || !cast || !synopsis || !posterUrl || !movieUrl) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        if (!musicRightsConfirmation) {
             return new Response(JSON.stringify({ error: 'You must confirm music rights ownership to submit.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
            submitterEmail: email || '',
            synopsis,
            submissionDate: FieldValue.serverTimestamp(),
            status: 'pending',
            musicRightsConfirmation: true
        };
        await db.collection('movie_pipeline').add(pipelineEntry);
        
        // Log security event for submission
        await db.collection('security_events').add({
            type: 'FILM_SUBMISSION',
            ip,
            timestamp: FieldValue.serverTimestamp(),
            details: { filmTitle, directorName, email: email || 'N/A' }
        });

        // Send an email notification to the admin
        const subject = `🎬 New Film Submission: "${filmTitle}"`;
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">New Submission in Pipeline</h1>
                <p>A new film has been submitted by a creator and is ready for your review in the <strong>Admin Dashboard</strong>.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Film Title:</strong> ${filmTitle}</p>
                    <p style="margin: 5px 0;"><strong>Director:</strong> ${directorName}</p>
                    <p style="margin: 5px 0;"><strong>Submitter Email:</strong> ${email ? `<a href="mailto:${email}" style="color: #ef4444;">${email}</a>` : 'Not provided'}</p>
                    <p style="margin: 5px 0;"><strong>Music Rights:</strong> ✅ Confirmed</p>
                </div>

                <p><strong>Synopsis:</strong></p>
                <p style="font-style: italic; color: #666;">${synopsis}</p>
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="https://cratetv.net/admin" style="background-color: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Admin Pipeline</a>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px;">
                    This is an automated notification from the Crate TV Infrastructure.
                </p>
            </div>
        `;
        
        const { data: resendData, error: emailError } = await resend.emails.send({
            from: `Crate TV Submissions <${fromEmail}>`,
            to: [adminEmail],
            subject: subject,
            html: emailHtml,
            reply_to: email || adminEmail
        });
        
        if (emailError) {
            console.error('[Resend Error] Submission notification failed:', emailError);
            // We return 200 because the pipeline entry WAS created in Firestore successfully.
            return new Response(JSON.stringify({ 
                success: true, 
                warning: 'Film added to pipeline, but email notification to admin failed. Ensure the FROM_EMAIL domain is verified in Resend.',
                errorDetails: emailError.message 
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({ success: true, messageId: resendData?.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Submission API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}