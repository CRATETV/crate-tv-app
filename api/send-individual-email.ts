import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

export async function POST(request: Request) {
    try {
        const { password, email, subject, htmlBody, scheduledAt, posterUrl, movieTitle, synopsis, movieKey } = await request.json();

        // 1. Initialize DB first to check dynamic permissions
        const initError = getInitializationError();
        if (initError) throw new Error(`Database Initialization Failure: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database terminal offline.");

        // 2. Comprehensive Authentication Check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        
        let isAuthenticated = (primaryAdminPassword && password === primaryAdminPassword) || 
                              (masterPassword && password === masterPassword);

        // If not a primary admin, check if it's a valid collaborator key
        if (!isAuthenticated) {
            const collabSnap = await db.collection('collaborator_access')
                .where('accessKey', '==', password)
                .limit(1)
                .get();
            
            if (!collabSnap.empty) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin or Collaborator key required.' }), { status: 401 });
        }

        if (!email || !subject || !htmlBody) {
            return new Response(JSON.stringify({ error: 'Recipient, subject, and body are required.' }), { status: 400 });
        }

        // 3. Fetch professional identity and signature from settings
        const settingsDoc = await db.collection('content').doc('settings').get();
        const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
        
        const businessEmail = settingsData?.businessEmail || FALLBACK_FROM;
        const signature = settingsData?.emailSignature || "";

        // 4. Handle Scheduling Logic
        if (scheduledAt) {
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
            return new Response(JSON.stringify({ success: true, message: 'Transmission scheduled for future dispatch.' }), { status: 200 });
        }

        // 5. Content Preparation
        const plainText = htmlBody.replace(/<[^>]+>/g, '').trim();

        // 6. Execute Transmission via Resend
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
                <body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
                        <tr>
                            <td align="center" style="padding: 60px 20px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                                    <!-- Brand Header -->
                                    <tr>
                                        <td align="center" style="padding-bottom: 60px;">
                                            <a href="https://cratetv.net" target="_blank">
                                                <img src="${LOGO_URL}" alt="Crate TV" width="140" style="display: block; border: 0;">
                                            </a>
                                        </td>
                                    </tr>

                                    <!-- Core Payload -->
                                    <tr>
                                        <td style="padding: 0 10px;">
                                            <div style="font-size: 16px; line-height: 1.8; color: #d1d5db;">
                                                ${htmlBody}
                                            </div>

                                            ${posterUrl ? `
                                            <!-- Curatorial Context Block -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 50px; background-color: #0a0a0a; border: 1px solid #1f2937; border-radius: 24px; overflow: hidden;">
                                                <tr>
                                                    <td align="center">
                                                        <img src="${posterUrl}" alt="${movieTitle}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; object-fit: cover;">
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 40px; text-align: center;">
                                                        <p style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 16px 0;">Official Selection Recommendation</p>
                                                        <h3 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; line-height: 1;">${movieTitle}</h3>
                                                        <p style="color: #6b7280; font-size: 15px; margin: 20px 0 32px 0; font-style: italic; line-height: 1.6;">
                                                            ${synopsis ? synopsis.replace(/<[^>]+>/g, '').substring(0, 180) + '...' : ''}
                                                        </p>
                                                        <a href="https://cratetv.net/movie/${movieKey}?play=true" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                                                            Stream Master File
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}

                                            ${signature ? `
                                            <div style="padding-top: 50px; color: #4b5563; font-size: 14px; font-style: italic; white-space: pre-wrap; line-height: 1.6;">
                                                ${signature}
                                            </div>
                                            ` : ''}
                                        </td>
                                    </tr>

                                    <!-- Technical Footer -->
                                    <tr>
                                        <td align="center" style="padding: 80px 10px 40px; border-top: 1px solid #111827;">
                                            <p style="font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 4px; font-weight: 900; margin: 0 0 12px 0;">Global Independent Infrastructure</p>
                                            <p style="font-size: 9px; color: #1f2937; margin: 0; font-weight: 700;">© ${new Date().getFullYear()} Crate TV. Philadelphia, PA // NYC.</p>
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

        if (error) throw new Error(`Resend Cloud Error: ${error.message}`);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("[Crate API] Transmission failure:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}