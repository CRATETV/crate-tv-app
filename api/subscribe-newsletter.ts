import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'studio@cratetv.net';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("Database offline.");

        // 1. Store in Firestore
        await db.collection('zine_subscriptions').doc(email.toLowerCase().trim()).set({
            email: email.toLowerCase().trim(),
            timestamp: FieldValue.serverTimestamp(),
            status: 'active'
        });

        // 2. Send Welcome Dispatch
        const welcomeHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 24px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" style="width: 120px; filter: invert(1);" />
                </div>
                <h1 style="color: #ef4444; text-transform: uppercase; font-size: 24px; text-align: center; letter-spacing: 2px;">Uplink Secured</h1>
                <p>Welcome to <strong>Crate Zine</strong>, the definitive record of the independent cinematic underground.</p>
                <p>You are now connected to our global dispatch network. You will receive exclusive interviews, deep dives into the vault, and first access to our "Live Premiere" watch parties.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">Official Dispatch // Sector 01 // Crate TV Infrastructure</p>
            </div>
        `;

        await resend.emails.send({
            from: `Crate Zine <${FROM_EMAIL}>`,
            to: [email],
            subject: '📰 Dispatch Node Activated',
            html: welcomeHtml
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Subscription Error:", error);
        return new Response(JSON.stringify({ error: "System deferred subscription." }), { status: 500 });
    }
}