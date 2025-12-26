import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

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
        const { name, email, message } = await request.json();
        if (!name || !email || !message) {
            return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const subject = `✉️ New Contact Message from ${name}`;
        const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">General Inquiry</h1>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #ef4444;">${email}</a></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Message:</strong></p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <p style="white-space: pre-wrap; margin: 0;">${message}</p>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; pt-10;">
                    Sent via Crate TV Contact Form. IP: ${ip || 'Unknown'}
                </p>
            </div>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Contact <${fromEmail}>`,
            to: [adminEmail],
            reply_to: email,
            subject: subject,
            html: emailHtml
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            throw new Error(`Failed to send email: ${emailError.message}`);
        }
        
        // Log contact form submission event
        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('security_events').add({
                    type: 'CONTACT_SENT',
                    ip,
                    timestamp: FieldValue.serverTimestamp(),
                    details: { name, email, userAgent: request.headers.get('user-agent') }
                });
            }
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Contact API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}