
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';

export async function POST(request: Request) {
    try {
        const { password, email, subject, htmlBody } = await request.json();

        // 1. Authentication check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!email || !subject || !htmlBody) {
            return new Response(JSON.stringify({ error: 'Recipient, subject, and body are required.' }), { status: 400 });
        }

        // 2. Fetch professional identity and signature from DB
        const initError = getInitializationError();
        const db = !initError ? getAdminDb() : null;
        let businessEmail = FALLBACK_FROM;
        let signature = "";

        if (db) {
            const settingsDoc = await db.collection('content').doc('settings').get();
            const data = settingsDoc.data();
            businessEmail = data?.businessEmail || FALLBACK_FROM;
            signature = data?.emailSignature || "";
        }

        // 3. Auto-append signature with professional line break
        const finalHtmlBody = signature 
            ? `${htmlBody}<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; color: #444; font-size: 14px; font-family: sans-serif; white-space: pre-wrap; line-height: 1.5;">${signature}</div>`
            : htmlBody;

        // 4. Dispatch via Resend
        const { error } = await resend.emails.send({
            from: `Crate TV Studio <${businessEmail}>`,
            to: [email],
            subject: subject,
            reply_to: businessEmail,
            html: `
                <div style="font-family: -apple-system, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" style="width: 120px; filter: invert(1);" />
                    </div>
                    ${finalHtmlBody}
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; text-align: center;">
                        Global Independent Infrastructure // Crate TV
                    </div>
                </div>
            `,
        });

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Transmission failed:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
