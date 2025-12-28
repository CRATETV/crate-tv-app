import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'cratetiv@gmail.com';

export async function POST(request: Request) {
    try {
        const { name, email, message } = await request.json();
        if (!name || !email || !message) {
            return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), { status: 400 });
        }

        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #ef4444;">New Message</h1>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">${message}</div>
            </div>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Contact <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            reply_to: email,
            subject: `✉️ Message from ${name}`,
            html: emailHtml
        });

        if (emailError) throw new Error(`Resend Error: ${emailError.message}`);
        
        // Log event to DB
        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('security_events').add({
                    type: 'CONTACT_SENT',
                    timestamp: FieldValue.serverTimestamp(),
                    details: { name, email }
                });
            }
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Contact API error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}