
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { escapeHtml } from './_lib/validation.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'studiocrate@gmail.com';

export async function POST(request: Request) {
    try {
    if (!rateLimit(`talent-inquiry:${getIP(request)}`, 5, 60 * 60_000)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
        const { actorName, senderName, senderEmail, message } = await request.json();

        if (!actorName || !senderName || !senderEmail || !message) {
            return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('talent_inquiries').add({
                    actorName,
                    senderName,
                    senderEmail,
                    message,
                    timestamp: FieldValue.serverTimestamp(),
                    status: 'unread'
                });
            }
        }

        // Previously: white text (`color: #ffffff`) with no dark background set anywhere
        // behind it — most email clients default to a white/light background, so this
        // was rendering as invisible white-on-white text.
        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Professional Inquiry</p>
            <h2 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">New Talent Inquiry</h2>
            <p style="margin:0 0 20px;">A new talent inquiry has been submitted through the Crate TV Actors Directory.</p>
            <p style="margin:0 0 8px;"><strong>Target Talent:</strong> ${escapeHtml(actorName)}</p>
            <p style="margin:0 0 20px;"><strong>From:</strong> ${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</p>
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; font-style: italic; color: #1a1a1a;">
                ${escapeHtml(String(message).slice(0, 5000)).replace(/\n/g, '<br/>')}
            </div>
            <p style="margin:24px 0 0;font-size: 11px; color: #999999;">This inquiry was routed through the Crate TV secure proxy and logged in the Admin Terminal.</p>
        `;

        const { error: emailError } = await resend.emails.send({
            from: `Crate TV Talent Proxy <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            reply_to: senderEmail,
            subject: `🎭 Talent Inquiry: ${String(actorName).replace(/[\r\n]/g, ' ').slice(0, 80)} (via ${String(senderName).replace(/[\r\n]/g, ' ').slice(0, 80)})`,
            html: renderBrandedEmail({ title: `Talent Inquiry: ${escapeHtml(String(actorName).slice(0, 80))}`, bodyHtml })
        });

        if (emailError) throw new Error(`Resend Error: ${emailError.message}`);
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('Talent Inquiry API error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}
