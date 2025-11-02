import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
    try {
        const { password, subject, htmlBody, audience = 'all' } = await request.json();

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
        
        const db = getAdminDb();
        if (!db) throw new Error("Firebase DB connection failed.");

        // --- Fetch users based on audience ---
        let usersQuery;
        const usersCollection = db.collection('users');

        if (audience === 'actors') {
            usersQuery = usersCollection.where('isActor', '==', true);
        } else if (audience === 'filmmakers') {
            usersQuery = usersCollection.where('isFilmmaker', '==', true);
        } else {
            usersQuery = usersCollection;
        }
        
        const usersSnapshot = await usersQuery.get();
        const allEmails = usersSnapshot.docs
            .map(doc => doc.data().email)
            .filter(email => !!email);


        if (allEmails.length === 0) {
            return new Response(JSON.stringify({ message: `No users found in the '${audience}' group.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
        
        return new Response(JSON.stringify({ success: true, message: `Email successfully sent to ${allEmails.length} users in the '${audience}' group.` }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error("Error sending bulk email:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}