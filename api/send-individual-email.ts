import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

export async function POST(request: Request) {
    try {
        const { password, email, subject, htmlBody, scheduledAt, posterUrl, movieTitle, synopsis, movieKey } = await request.json();

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

        // 3. Handle Scheduling Logic
        if (scheduledAt && db) {
            await db.collection('scheduled_dispatches').add({
                email,
                subject,
                htmlBody,
                scheduledAt: new Date(scheduledAt),
                status: 'pending',
                createdAt: new Date(),
                movieTitle,
                posterUrl,
                synopsis,
                movieKey
            });
            return new Response(JSON.stringify({ success: true, message: 'Dispatch scheduled.' }), { status: 200 });
        }

        // 4. Content Prep
        const plainText = htmlBody.replace(/<[^>]+>/g, '').trim();

        // 5. Dispatch Individual Transmission
        const { error } = await resend.emails.send({
            from: `Crate TV <${businessEmail}>`,
            to: [email],
            subject: subject,
            reply_to: businessEmail,
            text: plainText,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${subject}</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #050505;">
                                    <!-- Header / Logo -->
                                    <tr>
                                        <td align="center" style="padding-bottom: 40px;">
                                            <a href="https://cratetv.net" target="_blank">
                                                <img src="${LOGO_URL}" alt="Crate TV" width="120" style="display: block; border: 0;">
                                            </a>
                                        </td>
                                    </tr>

                                    <!-- Main Payload -->
                                    <tr>
                                        <td style="padding: 0 10px;">
                                            <div style="font-size: 16px; line-height: 1.6; color: #cccccc;">
                                                ${htmlBody}
                                            </div>

                                            ${posterUrl ? `
                                            <!-- Cinematic Content Spotlight -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden;">
                                                <tr>
                                                    <td align="center">
                                                        <img src="${posterUrl}" alt="${movieTitle}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; object-fit: cover;">
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 30px; text-align: center;">
                                                        <p style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px 0;">Official Recommendation</p>
                                                        <h3 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">${movieTitle}</h3>
                                                        <p style="color: #666666; font-size: 14px; margin: 15px 0 25px 0; font-style: italic;">
                                                            ${synopsis ? synopsis.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : ''}
                                                        </p>
                                                        <a href="https://cratetv.net/movie/${movieKey}?play=true" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 15px 30px; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                                                            Stream Master File
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}

                                            ${signature ? `
                                            <div style="padding-top: 40px; color: #555555; font-size: 13px; font-style: italic; white-space: pre-wrap;">
                                                ${signature}
                                            </div>
                                            ` : ''}
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td align="center" style="padding: 60px 10px 40px; border-top: 1px solid #111111;">
                                            <p style="font-size: 10px; color: #333333; text-transform: uppercase; letter-spacing: 3px; font-weight: bold; margin: 0 0 10px 0;">Global Independent Infrastructure</p>
                                            <p style="font-size: 9px; color: #222222; margin: 0;">© ${new Date().getFullYear()} Crate TV. Philadelphia, PA.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
        });

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Transmission failed:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
