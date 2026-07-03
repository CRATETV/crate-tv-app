import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';

// Manual "Send Reminder" trigger from the Watch Party Manager admin panel.
//
// This previously used `export default async function handler`, which is
// NOT the routing convention this codebase's Vercel functions actually use
// (every other endpoint uses a named `export async function POST`) — so
// Vercel never routed to this function at all and the admin button silently
// did nothing. It also queried a `unlocked_movies` collection that nothing
// in the app writes to anymore (real ticket data lives in `festival_tickets`,
// written by process-square-payment.ts) and only supported single movies,
// never festival blocks — which is what PWFF actually sells tickets for.
//
// Fixed to use the correct export convention, and to source recipients the
// same way the automated 30-minutes-before reminder does (see
// collectReminderRecipients in update-watch-parties.ts): direct ticket
// buyers for this exact item via `festival_tickets.itemId`, plus
// full-festival-pass holders who have access to everything and therefore
// never show up under one specific itemId.
export async function POST(request: Request) {
    try {
        const { itemId, title, watchPartyStartTime, adminPassword } = await request.json();

        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== process.env.ADMIN_MASTER_PASSWORD) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!itemId) {
            return new Response(JSON.stringify({ error: 'itemId required' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        const emails = new Set<string>();

        const ticketsSnap = await db.collection('festival_tickets').where('itemId', '==', itemId).get();
        ticketsSnap.forEach(doc => {
            const email = doc.data().email;
            if (email) emails.add(email);
        });

        const passHoldersSnap = await db.collection('users').where('hasFestivalAllAccess', '==', true).get();
        passHoldersSnap.forEach(doc => {
            const email = doc.data().email;
            if (email) emails.add(email);
        });

        if (emails.size === 0) {
            return new Response(JSON.stringify({ success: true, sent: 0, message: 'No ticket holders found' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const timeStr = watchPartyStartTime
            ? new Date(watchPartyStartTime).toLocaleString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
            })
            : null;
        const watchPartyUrl = `${process.env.VITE_APP_URL || 'https://cratetv.net'}/watchparty/${itemId}`;
        const displayTitle = title || 'Your Watch Party';

        let sent = 0;
        await Promise.allSettled(Array.from(emails).map(async (email) => {
            try {
                await resend.emails.send({
                    from: `Crate TV <${fromEmail}>`,
                    to: email,
                    subject: `Reminder: ${displayTitle} — Crate TV Watch Party`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
                            <div style="background: #E50914; padding: 20px 32px;">
                                <p style="margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(255,255,255,0.7);">Crate TV · Reminder</p>
                            </div>
                            <div style="padding: 36px 32px;">
                                <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin: 0 0 8px;">Watch Party Reminder</p>
                                <h1 style="font-size: 28px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase; line-height: 1.1;">${displayTitle}</h1>
                                ${timeStr ? `
                                <div style="background: #1a1a1a; border-left: 3px solid #E50914; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                                    <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #666;">Screening Time</p>
                                    <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: white;">${timeStr}</p>
                                </div>` : ''}
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
        }));

        return new Response(JSON.stringify({ success: true, sent, total: emails.size }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
