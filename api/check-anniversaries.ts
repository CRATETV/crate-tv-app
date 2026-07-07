
import { getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com'; 

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const auth = getAdminAuth();
        if (!auth) throw new Error("Firebase Auth connection failed.");

        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        let anniversaryUsers: string[] = [];
        let nextPageToken;
        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(userRecord => {
                if (userRecord.email && userRecord.metadata.creationTime) {
                    const creationDate = new Date(userRecord.metadata.creationTime);
                    if (creationDate.getMonth() === todayMonth && creationDate.getDate() === todayDay && creationDate.getFullYear() !== today.getFullYear()) {
                        anniversaryUsers.push(userRecord.email);
                    }
                }
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        if (anniversaryUsers.length === 0) {
            return new Response(JSON.stringify({ message: "No anniversaries today." }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }

        const subject = `🎉 ${anniversaryUsers.length} User Anniversaries Today!`;
        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Anniversaries</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">${anniversaryUsers.length} Sign-Up Anniversaries Today</h1>
            <p style="margin:0 0 16px;">The following users are celebrating their Crate TV sign-up anniversary today:</p>
            <ul style="margin:0;padding-left:20px;">
                ${anniversaryUsers.map(email => `<li style="margin-bottom:4px;">${email}</li>`).join('')}
            </ul>
        `;

        await resend.emails.send({
            from: `Crate TV Anniversaries <${fromEmail}>`,
            to: [adminEmail],
            subject: subject,
            html: renderBrandedEmail({ title: subject, bodyHtml }),
        });

        return new Response(JSON.stringify({ success: true, message: `Sent anniversary notification for ${anniversaryUsers.length} users.` }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error("Error checking anniversaries:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
