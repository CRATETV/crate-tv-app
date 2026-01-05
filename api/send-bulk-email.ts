import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { Buffer } from 'buffer';

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

        // 4. Prepare Cinematic Transmission Assets
        const logoResponse = await fetch(LOGO_URL);
        const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

        // 5. Batch Dispatch (BCC to prevent email leakage)
        const BATCH_SIZE = 45; // Resend recommended safe batch
        for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
            const batch = allEmails.slice(i, i + BATCH_SIZE);
            await resend.emails.send({
                from: `Crate TV Studio <${businessEmail}>`,
                to: 'delivered@resend.dev', // Synthetic recipient for bulk BCC
                bcc: batch,
                subject: subject,
                attachments: [
                    {
                        content: logoBuffer,
                        filename: 'logo.png',
                        cid: 'logo'
                    } as any
                ],
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #ffffff; max-width: 600px; margin: 0 auto; background: #050505; border-radius: 40px; overflow: hidden; border: 1px solid #222;">
                        
                        <div style="padding: 60px 40px; text-align: left;">
                            <img src="cid:logo" alt="Crate TV" style="width: 130px; height: auto; margin-bottom: 40px;" />
                            
                            <div style="margin-bottom: 40px; border-left: 4px solid #ef4444; padding-left: 20px;">
                                <p style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 8px;">Official Dispatch</p>
                                <h2 style="font-size: 32px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -1px; line-height: 1.1;">${subject}</h2>
                            </div>

                            <div style="font-size: 16px; color: #ccc; margin-bottom: 40px; line-height: 1.8;">
                                ${htmlBody}
                            </div>

                            <div style="text-align: center; margin-top: 50px;">
                                <a href="https://cratetv.net/zine" style="display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 18px 45px; border-radius: 16px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 20px 40px rgba(255,255,255,0.1);">Enter Library Manifest</a>
                            </div>
                        </div>

                        <div style="background: #000; padding: 50px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 4px; font-weight: 900; margin-bottom: 12px;">Global Independent Infrastructure</p>
                            <p style="font-size: 9px; color: #222; margin: 0;">© ${new Date().getFullYear()} Crate TV. All rights reserved.</p>
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.02);">
                                <p style="font-size: 8px; color: #111; text-transform: uppercase; letter-spacing: 2px;">AUTHENTICITY // PRESTIGE // AFTERLIFE</p>
                            </div>
                        </div>
                    </div>
                `,
            });
        }
        
        return new Response(JSON.stringify({ success: true, count: allEmails.length }), { status: 200 });

    } catch (error) {
        console.error("Broadcaster error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}