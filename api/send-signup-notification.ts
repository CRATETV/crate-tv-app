
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { escapeHtml } from './_lib/validation.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    if (!rateLimit(`signup-notify:${getIP(request)}`, 5, 60 * 60_000)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'User email is required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    const db = !initError ? getAdminDb() : null;
    let technicalEmail = FALLBACK_ADMIN;

    if (db) {
        const settingsDoc = await db.collection('content').doc('settings').get();
        technicalEmail = settingsDoc.data()?.technicalEmail || FALLBACK_ADMIN;
    }

    const { error } = await resend.emails.send({
        from: `Crate TV Alerts <${FROM_EMAIL}>`,
        to: [technicalEmail],
        subject: `🎉 New Sign-Up: ${String(email).replace(/[\r\n]/g, ' ').slice(0, 120)}`,
        html: renderBrandedEmail({
            title: `New Sign-Up: ${escapeHtml(String(email).slice(0, 120))}`,
            bodyHtml: `
                <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Infrastructure Alert</p>
                <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">New Sign-Up</h1>
                <p style="margin:0 0 20px;">A new user has joined Crate TV.</p>
                <p style="margin:0 0 8px;"><strong>Account:</strong> ${escapeHtml(String(email).slice(0, 120))}</p>
                <p style="margin:0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            `,
        }),
    });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Sign-up notify error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
  }
}
