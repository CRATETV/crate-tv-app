import { getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
    try {
        const { password, subject, htmlBody } = await request.json();

        // --- Authentication ---
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
          isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
        }
        
        if (!subject || !htmlBody) {
             return new Response(JSON.stringify({ error: 'Subject and message body are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
        }

        // --- Firebase Admin Init ---
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const auth = getAdminAuth();
        if (!auth) throw new Error("Firebase Auth connection failed.");

        // --- Fetch all users ---
        let allEmails: string[] = [];
        let nextPageToken;
        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(userRecord => {
                if (userRecord.email) {
                    allEmails.push(userRecord.email);
                }
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        if (allEmails.length === 0) {
            return new Response(JSON.stringify({ message: "No users to email." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // --- Send emails in batches of 50 using Resend ---
        const BATCH_SIZE = 50;
        for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
            const batch = allEmails.slice(i, i + BATCH_SIZE);
            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: 'delivered@resend.dev', // Required by Resend, but BCC overrides
                bcc: batch,
                subject: subject,
                html: htmlBody,
            });
        }
        
        return new Response(JSON.stringify({ success: true, message: `Email successfully sent to ${allEmails.length} users.` }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error("Error sending bulk email:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
}
