import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Buffer } from 'buffer';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

export async function POST(request: Request) {
    try {
        const { password, email, subject, htmlBody, posterUrl, movieTitle, movieKey, movieSynopsis } = await request.json();

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

        // 4. Dispatch with Netflix-inspired high-impact layout
        const { error } = await resend.emails.send({
            from: `Crate TV Studio <${businessEmail}>`,
            to: [email],
            subject: subject,
            reply_to: businessEmail,
            attachments: [
                {
                    content: logoBuffer,
                    filename: 'logo.png',
                    content_id: 'logo'
                }
            ],
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #ffffff; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a0b2e 0%, #050505 100%); border-radius: 32px; overflow: hidden;">
                    
                    <div style="padding: 40px; text-align: center;">
                        <img src="cid:logo" alt="Crate TV" style="width: 100px; height: auto; margin-bottom: 30px;" />
                        
                        ${posterUrl ? `
                        <div style="margin: 0 auto 30px; width: 280px; box-shadow: 0 30px 60px rgba(0,0,0,0.8); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                            <img src="${posterUrl}" alt="${movieTitle}" style="width: 100%; display: block;" />
                        </div>
                        ` : ''}

                        <h2 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; margin-bottom: 24px; text-transform: uppercase;">Did you like this?</h2>
                        
                        <!-- Feedback Buttons -->
                        <div style="margin-bottom: 40px;">
                            <a href="https://cratetv.net/movie/${movieKey}?feedback=down" style="display: inline-block; margin: 0 10px; text-decoration: none;">
                                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">
                                    <span style="font-size: 24px; line-height: 64px;">👎</span>
                                </div>
                            </a>
                            <a href="https://cratetv.net/movie/${movieKey}?feedback=up" style="display: inline-block; margin: 0 10px; text-decoration: none;">
                                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">
                                    <span style="font-size: 24px; line-height: 64px;">👍</span>
                                </div>
                            </a>
                            <a href="https://cratetv.net/movie/${movieKey}?feedback=doubleup" style="display: inline-block; margin: 0 10px; text-decoration: none;">
                                <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">
                                    <span style="font-size: 24px; line-height: 64px;">🤟</span>
                                </div>
                            </a>
                        </div>

                        <p style="color: #999; font-size: 14px; max-width: 400px; margin: 0 auto 40px; font-weight: 500;">Get better, more personalized recommendations after.</p>

                        <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 30px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 16px; color: #ddd; margin-bottom: 20px;">
                                ${htmlBody}
                            </div>
                            ${signature ? `<div style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); color: #666; font-size: 12px; white-space: pre-wrap;">${signature}</div>` : ''}
                        </div>
                    </div>

                    <div style="background: #000; padding: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                        <p style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; margin-bottom: 10px;">Global Independent Infrastructure</p>
                        <p style="font-size: 10px; color: #222; margin: 0;">© ${new Date().getFullYear()} Crate TV. All rights reserved.</p>
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