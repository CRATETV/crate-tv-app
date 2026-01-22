import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
const LOGO_URL = 'https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png';

export async function POST(request: Request) {
    try {
        const { password, subject, htmlBody, audience = 'subscribers' } = await request.json();

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

        const settingsDoc = await db.collection('content').doc('settings').get();
        const businessEmail = settingsDoc.data()?.businessEmail || FALLBACK_FROM;

        let allEmails: string[] = [];

        if (audience === 'subscribers') {
            const snap = await db.collection('zine_subscriptions').get();
            allEmails = snap.docs.map(doc => doc.id);
        } else if (audience === 'creators') {
            const snap = await db.collection('users').where('isActor', '==', true).get();
            const snap2 = await db.collection('users').where('isFilmmaker', '==', true).get();
            const set = new Set<string>();
            snap.forEach(d => set.add(d.data().email));
            snap2.forEach(d => set.add(d.data().email));
            allEmails = Array.from(set).filter(Boolean);
        } else {
            const snap = await db.collection('users').get();
            allEmails = snap.docs.map(doc => doc.data().email).filter(Boolean);
        }

        if (allEmails.length === 0) {
            return new Response(JSON.stringify({ message: 'Zero targetable nodes in segment.' }), { status: 200 });
        }

        const plainText = htmlBody.replace(/<[^>]+>/g, '').trim();

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
                    <body style="margin: 0; padding: 0; background-color: #050505; font-family: sans-serif; color: #ffffff;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
                            <tr>
                                <td align="center" style="padding: 60px 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                                        <tr>
                                            <td align="center" style="padding-bottom: 50px;">
                                                <img src="${LOGO_URL}" alt="Crate TV" width="130" style="display: block; border: 0; filter: invert(1);">
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="font-size: 16px; line-height: 1.8; color: #cccccc; padding: 0 20px;">
                                                ${htmlBody}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding-top: 60px; border-top: 1px solid #111; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">
                                                Official Dispatch // Crate TV Infrastructure
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
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Broadcaster error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}