// api/_lib/sendPremiereReminders.ts — the database + email half of premiere reminders.
// The rules (who, when, what words) are in premiereReminders.ts and are tested.
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { renderBrandedEmail, renderEmailButton } from './emailBranding.js';
import { mergeRecipients, reminderToken, reminderWords, ReminderStage } from './premiereReminders.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';
const APP = () => process.env.VITE_APP_URL || 'https://cratetv.net';
export const reminderSecret = () => process.env.REMINDER_SECRET || process.env.CRON_SECRET || '';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Signed-in viewers who tapped "Remind me" for this premiere: email -> account id. */
export async function signupRecipients(db: FirebaseFirestore.Firestore, itemId: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const snap = await db.collection('premiere_reminders').where('movieKey', '==', itemId).get();
    snap.forEach(d => {
        const { email, uid } = d.data();
        if (typeof email === 'string' && typeof uid === 'string') out.set(email.toLowerCase().trim(), uid);
    });
    return out;
}

/** People who bought a ticket (or used a ticket code) for one film's premiere. */
export async function movieTicketRecipients(db: FirebaseFirestore.Firestore, movieKey: string): Promise<string[]> {
    const emails: string[] = [];
    const tickets = await db.collection('festival_tickets').where('itemId', '==', movieKey).get();
    tickets.forEach(d => emails.push(d.data().email));
    const holders = await db.collection('users').where('unlockedWatchPartyKeys', 'array-contains', movieKey).get();
    holders.forEach(d => emails.push(d.data().email));
    return mergeRecipients(emails);
}

export async function sendPremiereReminder(db: FirebaseFirestore.Firestore, args: {
    itemId: string; title: string; startMs: number; stage: ReminderStage; ticketEmails: string[];
}): Promise<number> {
    const { itemId, title, startMs, stage } = args;
    const signups = await signupRecipients(db, itemId);
    const emails = mergeRecipients(args.ticketEmails, signups.keys());
    if (emails.length === 0) return 0;

    const when = new Date(startMs).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: 'America/New_York', timeZoneName: 'short',
    });
    const words = reminderWords(stage, title, when);
    const url = `${APP()}/watchparty/${encodeURIComponent(itemId)}`;
    const secret = reminderSecret();
    let sent = 0;
    await Promise.allSettled(emails.map(async email => {
        const uid = signups.get(email);
        const stop = uid && secret
            ? `<p style="margin:16px 0 0;font-size:12px;color:#999999;">You are getting this because you asked to be reminded. <a href="${APP()}/api/premiere-remind?t=${encodeURIComponent(reminderToken(secret, itemId, uid))}" style="color:#999999;">Stop reminders for this film</a>.</p>`
            : '';
        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">${words.kicker}</p>
            <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;color:#1a1a1a;text-transform:uppercase;line-height:1.1;">${esc(title)}</h1>
            <div style="background:#f4f4f4;border-left:3px solid #ef4444;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#666666;">Screening Time</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1a1a1a;">${esc(when)}</p>
            </div>
            ${renderEmailButton(stage === 'day' ? 'See the watch party' : 'Enter the lobby', url)}
            <p style="margin:20px 0 0;font-size:12px;color:#999999;text-align:center;">${esc(url)}</p>
            <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;">
                <p style="margin:0 0 12px;font-size:14px;">${words.tip}</p>
                <p style="margin:0;font-size:13px;color:#666666;">Your ticket and reminders are linked to your Crate TV account. Sign in at cratetv.net to join.</p>
                ${stop}
            </div>`;
        try {
            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`, to: email, subject: words.subject,
                html: renderBrandedEmail({ title: words.subject, bodyHtml }),
            });
            sent++;
        } catch (e) { console.error(`[premiere-reminder] ${stage} to ${email} failed:`, e); }
    }));
    console.log(`[premiere-reminder] ${stage} for ${itemId}: sent ${sent}/${emails.length}`);
    return sent;
}

/** Saved BEFORE sending, so a slow send can't be repeated by the next minute's cron tick. */
export async function markReminderSent(db: FirebaseFirestore.Firestore, itemId: string, stage: ReminderStage) {
    await db.collection('watch_parties').doc(itemId).set({ remindersSent: { [stage]: FieldValue.serverTimestamp() } }, { merge: true });
}
