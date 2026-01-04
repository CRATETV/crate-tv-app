
import { getAdminAuth, getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';

export async function POST(request: Request) {
    try {
        const { password, subject, htmlBody, audience = 'all' } = await request.json();

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

        const BATCH_SIZE = 50;
        for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
            const batch = allEmails.slice(i, i + BATCH_SIZE);
            await resend.emails.send({
                from: `Crate TV <${businessEmail}>`,
                to: 'delivered@resend.dev', 
                bcc: batch,
                subject,
                html: `<div style="font-family: sans-serif; line-height: 1.6; color: #111;">${htmlBody}</div>`,
            });
        }
        
        return new Response(JSON.stringify({ success: true, count: allEmails.length }), { status: 200 });

    } catch (error) {
        console.error("Broadcaster error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
