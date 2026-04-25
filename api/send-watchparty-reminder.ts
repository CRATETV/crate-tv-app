import { Resend } from 'resend';
import * as admin from 'firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { movieKey, adminPassword } = await req.json();

    if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ error: 'movieKey required' }), { status: 400 });
    }

    try {
        // Init Firebase Admin
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
            });
        }
        const db = admin.firestore();

        // Get the movie details
        const movieDoc = await db.collection('movies').doc(movieKey).get();
        if (!movieDoc.exists) {
            return new Response(JSON.stringify({ error: 'Movie not found' }), { status: 404 });
        }
        const movie = movieDoc.data()!;

        if (!movie.watchPartyStartTime) {
            return new Response(JSON.stringify({ error: 'No watch party start time set' }), { status: 400 });
        }

        const startDate = new Date(movie.watchPartyStartTime);
        const timeStr = startDate.toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit',
            timeZoneName: 'short'
        });

        const watchPartyUrl = `${process.env.VITE_APP_URL || 'https://cratetv.net'}/watchparty/${movieKey}`;

        // Find all users who have paid access to this watch party
        // Check both unlocked_movies collection and user profiles
        const accessSnapshot = await db.collection('unlocked_movies')
            .where('movieKey', '==', movieKey)
            .get();

        const emails: string[] = [];
        const userIds = new Set<string>();

        accessSnapshot.forEach(doc => {
            const uid = doc.data().userId;
            if (uid) userIds.add(uid);
        });

        // Get email for each user
        for (const uid of userIds) {
            try {
                const userRecord = await admin.auth().getUser(uid);
                if (userRecord.email) emails.push(userRecord.email);
            } catch (e) { /* user may not exist */ }
        }

        if (emails.length === 0) {
            return new Response(JSON.stringify({ success: true, sent: 0, message: 'No ticket holders found' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Send reminder to each ticket holder
        let sent = 0;
        for (const email of emails) {
            try {
                await resend.emails.send({
                    from: `Crate TV <${fromEmail}>`,
                    to: email,
                    subject: `Tomorrow night: ${movie.title} — Crate TV Watch Party`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
                            <div style="background: #E50914; padding: 20px 32px;">
                                <p style="margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(255,255,255,0.7);">Crate TV · Reminder</p>
                            </div>
                            <div style="padding: 36px 32px;">
                                <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin: 0 0 8px;">Watch Party Tomorrow</p>
                                <h1 style="font-size: 28px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase; line-height: 1.1;">${movie.title}</h1>
                                ${movie.director ? `<p style="color: #888; font-size: 13px; margin: 0 0 24px;">Directed by <strong style="color: white;">${movie.director}</strong></p>` : ''}
                                
                                <div style="background: #1a1a1a; border-left: 3px solid #E50914; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                                    <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #666;">Screening Time</p>
                                    <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: white;">${timeStr}</p>
                                </div>

                                <div style="text-align: center; margin: 0 0 32px;">
                                    <a href="${watchPartyUrl}" style="display: inline-block; background: #E50914; color: white; font-weight: 900; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; padding: 18px 48px; border-radius: 8px; text-decoration: none;">Enter Watch Party</a>
                                    <p style="margin: 12px 0 0; font-size: 11px; color: #444;">Bookmark this link — ${watchPartyUrl}</p>
                                </div>

                                <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
                                <p style="font-size: 11px; color: #555; margin: 0;">Your ticket is linked to your Crate TV account. Sign in at cratetv.net to access the lobby when it opens.</p>
                            </div>
                        </div>
                    `,
                });
                sent++;
            } catch (e) {
                console.error(`Failed to send to ${email}:`, e);
            }
        }

        return new Response(JSON.stringify({ success: true, sent, total: emails.length }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
