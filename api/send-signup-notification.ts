
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
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
        subject: `🎉 New Sign-Up: ${email}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
                <h1 style="color: #ef4444; text-transform: uppercase;">Infrastructure Alert</h1>
                <p>A new node has been initialized in the global user cluster.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Account ID:</strong> ${email}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
        `,
    });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Sign-up notify error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
  }
}
