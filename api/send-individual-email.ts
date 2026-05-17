import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetv.net/crate-logo-email.png';

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
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta name="color-scheme" content="light dark">
                    <meta name="supported-color-schemes" content="light dark">
                    <title>${subject}</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

                                    <!-- Dark Header Bar with Logo -->
                                    <tr>
                                        <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 32px 40px;">
                                            <a href="https://cratetv.net" target="_blank">
                                                <img src="${LOGO_URL}" alt="Crate TV" width="130" style="display: block; border: 0;">
                                            </a>
                                        </td>
                                    </tr>

                                    <!-- Red accent line -->
                                    <tr>
                                        <td bgcolor="#ef4444" style="background-color: #ef4444; height: 3px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                                    </tr>

                                    <!-- Core Content -->
                                    <tr>
                                        <td style="padding: 40px 40px 32px; background-color: #ffffff;" bgcolor="#ffffff">
                                            <div style="font-size: 16px; line-height: 1.8; color: #1a1a1a;">
                                                ${htmlBody}
                                            </div>

                                            ${posterUrl ? `
                                            <!-- Film Block -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
                                                <tr>
                                                    <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a;">
                                                        <img src="${posterUrl}" alt="${movieTitle}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block;">
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 32px 40px;">
                                                        <p style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 12px 0;">Official Selection</p>
                                                        <h3 style="margin: 0 0 16px 0; color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; line-height: 1.1;">${movieTitle}</h3>
                                                        <p style="color: #999999; font-size: 14px; margin: 0 0 28px 0; font-style: italic; line-height: 1.6;">
                                                            ${synopsis ? synopsis.replace(/<[^>]+>/g, '').substring(0, 180) + '...' : ''}
                                                        </p>
                                                        <a href="https://cratetv.net/movie/${movieKey}?play=true" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                                                            ▶ Stream Now
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}

                                            ${signature ? `
                                            <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e5e5; color: #555555; font-size: 14px; font-style: italic; white-space: pre-wrap; line-height: 1.7;">
                                                ${signature}
                                            </div>
                                            ` : ''}
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 28px 40px;">
                                            <p style="font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; margin: 0 0 8px 0;">Global Independent Infrastructure</p>
                                            <p style="font-size: 9px; color: #444444; margin: 0;">© ${new Date().getFullYear()} Crate TV. Philadelphia, PA // NYC.</p>
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