import { getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com'; // Admin email to notify

export async function GET(request: Request) {
    try {
        // --- Cron Job Authentication ---
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        // --- Firebase Admin Init ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const auth = getAdminAuth();
        if (!auth) throw new Error("Firebase Auth connection failed.");

        // --- Get today's date ---
        const today = new Date();
        const todayMonth = today.getMonth(); // 0-11
        const todayDay = today.getDate();

        // --- Find users with anniversaries ---
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
            console.log("No user anniversaries today.");
            return new Response(JSON.stringify({ message: "No anniversaries today." }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }

        // --- Send notification email to admin ---
        const subject = `🎉 ${anniversaryUsers.length} User Anniversaries Today!`;
        const emailHtml = `
            <div>
                <h1>User Sign-Up Anniversaries</h1>
                <p>The following users are celebrating their Crate TV sign-up anniversary today:</p>
                <ul>
                    ${anniversaryUsers.map(email => `<li>${email}</li>`).join('')}
                </ul>
            </div>
        `;

        await resend.emails.send({
            from: `Crate TV Anniversaries <${fromEmail}>`,
            to: [adminEmail],
            subject: subject,
            html: emailHtml,
        });

        return new Response(JSON.stringify({ success: true, message: `Sent anniversary notification for ${anniversaryUsers.length} users.` }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error("Error checking anniversaries:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        // Return 500 so Vercel logs the cron job failure
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
