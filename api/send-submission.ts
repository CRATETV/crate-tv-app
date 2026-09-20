
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { escapeHtml, cleanText, cleanLine, isValidEmail, safeHttpUrl } from './_lib/validation.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'studio@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { website_url_check, password } = payload;

        // SECURITY: If the honeypot field is filled, reject immediately
        if (website_url_check) {
            console.warn("[SECURITY] Blocked submission attempt from bot (honeypot triggered).");
            return new Response(JSON.stringify({ error: 'System processing error' }), { status: 403 });
        }

        // SECURITY: this endpoint writes to the pipeline and emails the team, and its only
        // callers are admin screens (Submissions tab manual entry, Archive Scout). It used
        // to be open to anyone on the internet.
        if (!(await verifyAdminPassword(password))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // Clean everything before it is stored or emailed.
        const filmTitle = cleanLine(payload.filmTitle, 200);
        const directorName = cleanLine(payload.directorName, 200);
        const cast = cleanText(payload.cast, 1000);
        const synopsis = cleanText(payload.synopsis, 5000);
        const email = cleanLine(payload.email, 254).toLowerCase();
        const posterUrl = safeHttpUrl(payload.posterUrl, { allowHttp: true });
        const movieUrl = safeHttpUrl(payload.movieUrl, { allowHttp: true });

        if (!filmTitle || !directorName || !cast || !synopsis || !posterUrl || !movieUrl) {
            return new Response(JSON.stringify({ error: 'All fields are required (poster and movie must be valid http(s) links).' }), { status: 400 });
        }
        if (email && !isValidEmail(email)) {
            return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), { status: 400 });
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
            submittedAt: FieldValue.serverTimestamp(),
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

        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Catalog Submission</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">New Film Submitted</h1>
            <p style="margin:0 0 20px;">A new film has been routed to the Grand Jury Hub for adjudication.</p>
            <p style="margin:0 0 8px;"><strong>Film:</strong> ${escapeHtml(filmTitle)}</p>
            <p style="margin:0 0 8px;"><strong>Director:</strong> ${escapeHtml(directorName)}</p>
            <p style="margin:0 0 8px;"><strong>Contact:</strong> ${escapeHtml(email) || 'N/A'}</p>
            <p style="margin:0;"><strong>Synopsis:</strong> ${escapeHtml(synopsis)}</p>
        `;

        try {
            await resend.emails.send({
                from: `Crate TV Studio <${FROM_EMAIL}>`,
                to: [alertEmail],
                subject: `🎬 Submission: ${filmTitle}`,
                html: renderBrandedEmail({ title: `Submission: ${escapeHtml(filmTitle)}`, bodyHtml }),
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
