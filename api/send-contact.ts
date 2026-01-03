
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

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

        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #ef4444; text-transform: uppercase; font-size: 20px;">Incoming Contact Form</h1>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Reply-to:</strong> ${email}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Message:</strong></p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; font-style: italic;">${message}</div>
                <p style="font-size: 10px; color: #999; margin-top: 20px;">Transmission routed via Crate TV Studio Infrastructure.</p>
            </div>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Contact <${FROM_EMAIL}>`,
            to: [studioEmail],
            reply_to: email,
            subject: `✉️ Message from ${name}`,
            html: emailHtml
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
