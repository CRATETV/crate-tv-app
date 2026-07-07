import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';

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
                const bodyHtml = `
                    <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Watch Party Reminder</p>
                    <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;color:#1a1a1a;text-transform:uppercase;line-height:1.1;">${displayTitle}</h1>
                    ${timeStr ? `
                    <div style="background:#f4f4f4;border-left:3px solid #ef4444;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
                        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#666666;">Screening Time</p>
                        <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1a1a1a;">${timeStr}</p>
                    </div>` : ''}
                    ${renderEmailButton('Enter Watch Party', watchPartyUrl)}
                    <p style="margin:20px 0 0;font-size:12px;color:#999999;text-align:center;">Bookmark this link — ${watchPartyUrl}</p>
                    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;">
                        <p style="margin:0 0 12px;font-size:14px;">Doors open a little before showtime — jumping in a few minutes early gets you the smoothest start, since joining mid-film can take a moment longer to catch up.</p>
                        <p style="margin:0;font-size:13px;color:#666666;">Your ticket is linked to your Crate TV account. Sign in at cratetv.net to access the lobby when it opens.</p>
                    </div>
                `;
                await resend.emails.send({
                    from: `Crate TV <${fromEmail}>`,
                    to: email,
                    subject: `Reminder: ${displayTitle} — Crate TV Watch Party`,
                    html: renderBrandedEmail({ title: `Reminder: ${displayTitle}`, bodyHtml }),
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
