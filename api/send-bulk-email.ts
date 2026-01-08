import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

export async function POST(request: Request) {
    try {
        const { password, subject, htmlBody, audience = 'all' } = await request.json();

        // 1. Authentication check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error("Infrastructure Offline");

        // 2. Fetch professional identity
        const settingsDoc = await db.collection('content').doc('settings').get();
        const businessEmail = settingsDoc.data()?.businessEmail || FALLBACK_FROM;

        // 3. Segment Identification
        let allEmails: string[] = [];

        if (audience === 'inactive') {
            const result = await auth.listUsers(1000);
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            allEmails = result.users
                .filter(u => !u.metadata.lastSignInTime || new Date(u.metadata.lastSignInTime).getTime() < twoWeeksAgo)
                .map(u => u.email)
                .filter((e): e is string => !!e);
        } else {
            let usersQuery = db.collection('users');
            if (audience === 'actors') usersQuery = usersQuery.where('isActor', '==', true) as any;
            else if (audience === 'filmmakers') usersQuery = usersQuery.where('isFilmmaker', '==', true) as any;
            
            const usersSnapshot = await usersQuery.get();
            allEmails = usersSnapshot.docs.map(doc => doc.data().email).filter(email => !!email);
        }

        if (allEmails.length === 0) {
            return new Response(JSON.stringify({ message: `No targetable nodes in '${audience}' segment.` }), { status: 200 });
        }

        // 4. Content Cleanup for Spam Filters
        // Stripping HTML for a clean plain-text fallback version
        const plainText = htmlBody.replace(/<[^>]+>/g, '').trim();

        // 5. Batch Dispatch (BCC to prevent email leakage and reduce spam signature)
        const BATCH_SIZE = 40; 
        for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
            const batch = allEmails.slice(i, i + BATCH_SIZE);
            await resend.emails.send({
                from: `Crate TV <${businessEmail}>`,
                to: 'delivered@resend.dev', 
                bcc: batch,
                reply_to: businessEmail,
                subject: subject,
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
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; min-height: 100%;">
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <!-- Main Container -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #050505;">
                                        <!-- Header / Logo -->
                                        <tr>
                                            <td align="center" style="padding-bottom: 50px;">
                                                <a href="https://cratetv.net" target="_blank" style="text-decoration: none;">
                                                    <img src="${LOGO_URL}" alt="Crate TV" width="130" style="display: block; border: 0; outline: none;">
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Content Block -->
                                        <tr>
                                            <td style="padding: 0 10px;">
                                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td style="font-size: 16px; line-height: 1.6; color: #cccccc;">
                                                            ${htmlBody}
                                                        </td>
                                                    </tr>
                                                    
                                                    <!-- Action CTA -->
                                                    <tr>
                                                        <td align="center" style="padding: 50px 0;">
                                                            <table border="0" cellspacing="0" cellpadding="0">
                                                                <tr>
                                                                    <td align="center" bgcolor="#ef4444" style="border-radius: 4px;">
                                                                        <a href="https://cratetv.net" target="_blank" style="display: inline-block; padding: 15px 35px; font-size: 14px; color: #ffffff; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                                                            Access Your Dashboard
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>

                                        <!-- Footer Section (Legal & Spam Compliance) -->
                                        <tr>
                                            <td style="padding: 60px 10px 40px; border-top: 1px solid #1a1a1a; text-align: center;">
                                                <p style="font-size: 11px; line-height: 1.6; color: #555555; margin: 0;">
                                                    This is an official transmission from Crate TV.
                                                    <br>
                                                    To update your email preferences, visit your <a href="https://cratetv.net/account" style="color: #666666; text-decoration: underline;">Account Settings</a>.
                                                </p>
                                                <p style="font-size: 11px; line-height: 1.6; color: #555555; margin: 20px 0 0;">
                                                    &copy; ${new Date().getFullYear()} Crate TV. All rights reserved.
                                                    <br>
                                                    Philadelphia, PA // Global Independent Infrastructure
                                                </p>
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
        }
        
        return new Response(JSON.stringify({ success: true, count: allEmails.length }), { status: 200 });

    } catch (error) {
        console.error("Broadcaster error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
