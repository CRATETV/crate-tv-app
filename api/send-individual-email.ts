import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Buffer } from 'buffer';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

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

        // 2. Fetch professional identity and signature
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

        // 3. Prepare Logo for CID
        const logoResponse = await fetch(LOGO_URL);
        const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

        // 4. Dispatch with clean, industrial correspondence layout
        const { error } = await resend.emails.send({
            from: `Crate TV Studio <${businessEmail}>`,
            to: [email],
            subject: subject,
            reply_to: businessEmail,
            attachments: [
                {
                    content: logoBuffer,
                    filename: 'logo.png',
                    cid: 'logo'
                } as any
            ],
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #ffffff; max-width: 600px; margin: 0 auto; background: #050505; border-radius: 32px; overflow: hidden; border: 1px solid #222;">
                    
                    <div style="padding: 60px 40px; text-align: left;">
                        <img src="cid:logo" alt="Crate TV" style="width: 120px; height: auto; margin-bottom: 40px;" />
                        
                        <div style="font-size: 16px; color: #ccc; margin-bottom: 40px; line-height: 1.8;">
                            ${htmlBody}
                        </div>

                        ${signature ? `
                        <div style="padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); color: #666; font-size: 13px; white-space: pre-wrap; font-style: italic;">
                            ${signature}
                        </div>
                        ` : ''}
                    </div>

                    <div style="background: #000; padding: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                        <p style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; margin-bottom: 10px;">Global Independent Infrastructure</p>
                        <p style="font-size: 10px; color: #222; margin: 0;">© ${new Date().getFullYear()} Crate TV. All rights reserved.</p>
                        <p style="font-size: 9px; color: #111; margin-top: 20px;">TRANSMISSION_SECURED // AUTH_NODE_ALPHA</p>
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