
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'studio@cratetv.net';
const FALLBACK_ADMIN = 'studio@cratetv.net';

export async function POST(request: Request) {
    try {
        const { name, email, message } = await request.json();
        if (!name || !email || !message) {
            return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // Fetch Dynamic Business Email from Settings
        const settingsDoc = await db.collection('content').doc('settings').get();
        const studioEmail = settingsDoc.data()?.businessEmail || FALLBACK_ADMIN;

        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Contact Form</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">New Message</h1>
            <p style="margin:0 0 8px;"><strong>From:</strong> ${name}</p>
            <p style="margin:0 0 20px;"><strong>Reply-to:</strong> ${email}</p>
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; font-style: italic; color: #1a1a1a;">${message}</div>
            <p style="font-size: 11px; color: #999999; margin-top: 20px;">Routed via Crate TV Studio Infrastructure.</p>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Contact <${FROM_EMAIL}>`,
            to: [studioEmail],
            reply_to: email,
            subject: `✉️ Message from ${name}`,
            html: renderBrandedEmail({ title: `Message from ${name}`, bodyHtml })
        });

        if (emailError) throw new Error(`Resend Error: ${emailError.message}`);
        
        await db.collection('security_events').add({
            type: 'CONTACT_SENT',
            timestamp: FieldValue.serverTimestamp(),
            details: { name, email, target: studioEmail }
        });
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Contact API error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}
