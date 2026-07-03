
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';

// ── AUTOMATED "STARTS SOON" REMINDER ──────────────────────────────────────
// Previously the only way a ticket holder got a reminder email was an admin
// manually clicking "Send Reminder" in the Watch Party Manager — easy to
// forget, and something that had to be repeated per-block for every block
// in a festival. This piggybacks on the cron that already runs every minute
// checking block start times for auto-start, so there's no new cron job to
// add (and no new per-minute Firestore read pass — it reuses the same block
// list already being iterated for auto-start).
//
// Fires once per block, in the ~1-minute window 30-29 minutes before it
// starts (matching the once-a-minute cron cadence so it's not fired
// repeatedly), with a `remindersSentAt` flag on the party doc as a backstop
// in case a cron tick is ever skipped/retried.
async function collectReminderRecipients(db: FirebaseFirestore.Firestore, blockId: string): Promise<string[]> {
    const emails = new Set<string>();

    // Direct ticket buyers for this specific block — festival_tickets already
    // stores the buyer's email at purchase time (see process-square-payment.ts).
    const ticketsSnap = await db.collection('festival_tickets').where('itemId', '==', blockId).get();
    ticketsSnap.forEach(doc => {
        const email = doc.data().email;
        if (email) emails.add(email);
    });

    // Full-festival-pass holders have access to every block, not just ones
    // they bought a ticket for individually, so they won't show up in
    // festival_tickets for this specific block — pull them separately.
    const passHoldersSnap = await db.collection('users').where('hasFestivalAllAccess', '==', true).get();
    passHoldersSnap.forEach(doc => {
        const email = doc.data().email;
        if (email) emails.add(email);
    });

    return Array.from(emails);
}

async function sendBlockReminders(db: FirebaseFirestore.Firestore, block: any, startTime: Date) {
    const emails = await collectReminderRecipients(db, block.id);
    if (emails.length === 0) return;

    const timeStr = startTime.toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
    const watchPartyUrl = `${process.env.VITE_APP_URL || 'https://cratetv.net'}/watchparty/${block.id}`;

    await Promise.allSettled(emails.map(email => resend.emails.send({
        from: `Crate TV <${fromEmail}>`,
        to: email,
        subject: `Starting in 30 minutes: ${block.title} — Crate TV Watch Party`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
                <div style="background: #E50914; padding: 20px 32px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(255,255,255,0.7);">Crate TV · Starting Soon</p>
                </div>
                <div style="padding: 36px 32px;">
                    <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin: 0 0 8px;">Starts In 30 Minutes</p>
                    <h1 style="font-size: 28px; font-weight: 900; color: white; margin: 0 0 24px; text-transform: uppercase; line-height: 1.1;">${block.title}</h1>
                    <div style="background: #1a1a1a; border-left: 3px solid #E50914; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #666;">Screening Time</p>
                        <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: white;">${timeStr}</p>
                    </div>
                    <div style="text-align: center; margin: 0 0 32px;">
                        <a href="${watchPartyUrl}" style="display: inline-block; background: #E50914; color: white; font-weight: 900; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; padding: 18px 48px; border-radius: 8px; text-decoration: none;">Enter The Lobby</a>
                        <p style="margin: 12px 0 0; font-size: 11px; color: #444;">${watchPartyUrl}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
                    <p style="font-size: 11px; color: #555; margin: 0;">Your ticket is linked to your Crate TV account. Sign in at cratetv.net to join.</p>
                </div>
            </div>
        `,
    }).catch(e => console.error(`[reminder] Failed to send to ${email}:`, e))));

    console.log(`[reminder] Sent ${emails.length} reminder(s) for block ${block.id} (${block.title})`);
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error("[SECURITY] Unauthorized attempt to trigger Watch Party Cron.");
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        const now = new Date();
        const batch = db.batch();
        let mutationsCount = 0;

        // 1. Fetch Current State
        const moviesSnapshot = await db.collection('movies').where('isWatchPartyEnabled', '==', true).get();
        const festivalDaysSnapshot = await db.collection('festival').doc('schedule').collection('days').get();
        const partiesSnapshot = await db.collection('watch_parties').get();
        const partyStates = new Map();
        partiesSnapshot.forEach(doc => partyStates.set(doc.id, doc.data()));

        // 2. AUTO-START: Standalone Movies
        moviesSnapshot.forEach(doc => {
            const movie = doc.data();
            const state = partyStates.get(doc.id);
            const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
            
            if (startTime && startTime <= now && (!state || state.status !== 'live')) {
                batch.set(db.collection('watch_parties').doc(doc.id), {
                    status: 'live',
                    type: 'movie',
                    isPlaying: true,
                    currentTime: 0,
                    actualStartTime: FieldValue.serverTimestamp(),
                    lastUpdated: FieldValue.serverTimestamp(),
                    backstageKey: Math.random().toString(36).substring(2, 8).toUpperCase()
                }, { merge: true });
                mutationsCount++;
            }
        });

        // 3. AUTO-START: Festival Blocks (+ collect blocks due a "starts soon" reminder)
        const blocksNeedingReminders: { block: any; startTime: Date }[] = [];
        festivalDaysSnapshot.forEach(doc => {
            const day = doc.data();
            if (day.blocks) {
                day.blocks.forEach((block: any) => {
                    if (block.isWatchPartyEnabled !== false) {
                        const state = partyStates.get(block.id);
                        // Use watchPartyStartTime OR screeningStartTime (whichever admin set)
                        const startTimeStr = block.watchPartyStartTime || block.screeningStartTime;
                        const startTime = startTimeStr ? new Date(startTimeStr) : null;

                        if (startTime && startTime <= now && (!state || state.status !== 'live')) {
                            batch.set(db.collection('watch_parties').doc(block.id), {
                                status: 'live',
                                activeMovieIndex: 0, // Reset — don't inherit leftover index from a previous screening
                                type: 'block',
                                isPlaying: true,
                                currentTime: 0,
                                actualStartTime: FieldValue.serverTimestamp(),
                                filmStartTime: startTimeStr,
                                lastUpdated: FieldValue.serverTimestamp(),
                                backstageKey: Math.random().toString(36).substring(2, 8).toUpperCase()
                            }, { merge: true });
                            mutationsCount++;
                            console.log(`[AUTO-START] Block ${block.id} (${block.title}) started at ${startTimeStr}`);
                        }

                        // "Starts in 30 minutes" reminder window — see collectReminderRecipients/
                        // sendBlockReminders above for why this piggybacks on this same cron tick.
                        if (startTime && !state?.remindersSentAt) {
                            const minutesUntilStart = (startTime.getTime() - now.getTime()) / 60000;
                            if (minutesUntilStart <= 30 && minutesUntilStart > 29) {
                                blocksNeedingReminders.push({ block, startTime });
                            }
                        }
                    }
                });
            }
        });

        // 4. CLEANUP: End stale live sessions (after 12 hours)
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const activeParties = await db.collection('watch_parties').where('status', '==', 'live').get();
        
        activeParties.forEach(doc => {
            const data = doc.data();
            const lastUpdated = data.lastUpdated?.toDate();
            if (lastUpdated && lastUpdated < twelveHoursAgo) {
                batch.update(doc.ref, { 
                    status: 'ended', 
                    isPlaying: false,
                    lastUpdated: FieldValue.serverTimestamp()
                });
                mutationsCount++;
            }
        });

        if (mutationsCount > 0) {
            await batch.commit();
        }

        // Send any due reminders after the main batch — email delivery is
        // slower I/O and shouldn't hold up the auto-start writes above.
        // remindersSentAt is set immediately (before actually sending) so a
        // slow Resend call can't cause the NEXT cron tick — 60 seconds later
        // — to double-send while this one is still in flight.
        for (const { block, startTime } of blocksNeedingReminders) {
            try {
                await db.collection('watch_parties').doc(block.id).set({
                    remindersSentAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                await sendBlockReminders(db, block, startTime);
            } catch (e) {
                console.error(`[reminder] Failed processing block ${block.id}:`, e);
            }
        }

        return new Response(JSON.stringify({ success: true, mutationsCount, remindersSent: blocksNeedingReminders.length }), { status: 200 });

    } catch (error) {
        console.error("Error in update-watch-parties cron job:", error);
        return new Response(JSON.stringify({ error: 'System processing failed.' }), { status: 500 });
    }
}
