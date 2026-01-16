
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'studio@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { filmTitle, directorName, cast, email, synopsis, posterUrl, movieUrl, website_url_check } = payload;

        // SECURITY: If the honeypot field is filled, reject immediately
        if (website_url_check) {
            console.warn("[SECURITY] Blocked submission attempt from bot (honeypot triggered).");
            return new Response(JSON.stringify({ error: 'System processing error' }), { status: 403 });
        }

        if (!filmTitle || !directorName || !cast || !synopsis || !posterUrl || !movieUrl) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // Fetch Dynamic Technical Email from Settings for the alert, use Business for Reply-to
        const settingsDoc = await db.collection('content').doc('settings').get();
        const alertEmail = settingsDoc.data()?.technicalEmail || FALLBACK_ADMIN;
        const studioEmail = settingsDoc.data()?.businessEmail || FROM_EMAIL;

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
            source: 'WEB_FORM_V4_SECURE', 
            musicRightsConfirmation: true
        };
        
        await db.collection('movie_pipeline').add(pipelineEntry);

        // Security Audit Log
        await db.collection('security_events').add({
            type: 'SUBMISSION_RECEIVED',
            timestamp: FieldValue.serverTimestamp(),
            details: { filmTitle, directorName, email }
        });

        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 20px;">
                <h1 style="color: #ef4444; text-transform: uppercase; font-size: 18px; letter-spacing: 2px;">Catalog Submission</h1>
                <p>A new film has been routed to the **Grand Jury Hub** for adjudication.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Film:</strong> ${filmTitle}</p>
                <p><strong>Director:</strong> ${directorName}</p>
                <p><strong>Contact:</strong> ${email || 'N/A'}</p>
                <p><strong>Synopsis:</strong> ${synopsis}</p>
            </div>
        `;
        
        try {
            await resend.emails.send({
                from: `Crate TV Studio <${FROM_EMAIL}>`,
                to: [alertEmail],
                subject: `🎬 Submission: ${filmTitle}`,
                html: emailHtml,
                reply_to: email || studioEmail
            });
        } catch (e) {
            console.warn("[Resend Warning] Pipeline notification failed:", e);
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Submission API Error:', error);
        return new Response(JSON.stringify({ error: 'System core rejected transmission.' }), { status: 500 });
    }
}
