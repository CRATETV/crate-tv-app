// api/_lib/partnerEmails.ts — the few emails "Festival in a box" sends.
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './emailBranding.js';

const siteUrl = () => process.env.VITE_APP_URL || 'https://cratetv.net';
const fromEmail = () => process.env.FROM_EMAIL || 'studio@cratetv.net';

const esc = (s: string) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function send(to: string[], subject: string, title: string, bodyHtml: string): Promise<void> {
    const recipients = [...new Set(to.map(e => e.trim().toLowerCase()).filter(Boolean))];
    if (!recipients.length || !process.env.RESEND_API_KEY) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await Promise.allSettled(recipients.map(email => resend.emails.send({
        from: `Crate TV <${fromEmail()}>`,
        to: email,
        subject,
        html: renderBrandedEmail({ title, bodyHtml }),
    })));
}

export const ownerEmails = () => (process.env.ADMIN_OWNER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

export function sendPartnerInvite(email: string, partnerName: string, token: string) {
    const link = `${siteUrl()}/partner?invite=${encodeURIComponent(token)}`;
    return send([email], `You're invited to manage ${partnerName} on Crate TV`, 'Your festival portal',
        `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#1a1a1a;">${esc(partnerName)} on Crate TV</h1>
         <p style="margin:0 0 16px;font-size:14px;">You've been added to the team for <strong>${esc(partnerName)}</strong>. From the festival portal you can upload your films, build your screening schedule, set ticket prices and follow sales live.</p>
         <p style="margin:0 0 24px;font-size:14px;">Sign in (or create a free Crate TV account) with this email address, then accept the invitation.</p>
         ${renderEmailButton('Open the festival portal', link)}
         <p style="margin:20px 0 0;font-size:12px;color:#999;">This invitation expires in 14 days.</p>`);
}

export function notifyOwnerSubmitted(partnerName: string, filmCount: number, blockCount: number) {
    return send(ownerEmails(), `Lineup submitted for review: ${partnerName}`, 'Lineup ready for review',
        `<p style="font-size:14px;"><strong>${esc(partnerName)}</strong> submitted their festival lineup: ${filmCount} film(s) in ${blockCount} block(s).</p>
         ${renderEmailButton('Review in the admin panel', `${siteUrl()}/admin`)}`);
}

export function notifyPartnerReviewed(to: string[], partnerName: string, approved: boolean, note: string, slug: string) {
    const body = approved
        ? `<p style="font-size:14px;">Your lineup for <strong>${esc(partnerName)}</strong> is approved and live.</p>
           ${note ? `<p style="font-size:14px;background:#f4f4f4;padding:12px 16px;border-radius:8px;">${esc(note)}</p>` : ''}
           ${renderEmailButton('See your festival page', `${siteUrl()}/festivals/${slug}`)}`
        : `<p style="font-size:14px;">Crate TV reviewed your lineup for <strong>${esc(partnerName)}</strong> and asked for a few changes:</p>
           <p style="font-size:14px;background:#f4f4f4;padding:12px 16px;border-radius:8px;">${esc(note || 'See the portal for details.')}</p>
           ${renderEmailButton('Open the festival portal', `${siteUrl()}/partner`)}`;
    return send(to, approved ? `${partnerName} is live on Crate TV` : `Changes requested: ${partnerName}`,
        approved ? 'Your festival is live' : 'A few changes needed', body);
}

// ── Zine pieces written by partners ──────────────────────────────────────

export function notifyOwnerPieceSubmitted(partnerName: string, title: string) {
    return send(ownerEmails(), `New zine piece from ${partnerName}`, 'A partner wrote for The Unpack',
        `<p style="font-size:14px;"><strong>${esc(partnerName)}</strong> sent in a piece for The Unpack: <em>${esc(title)}</em>.</p>
         ${renderEmailButton('Read it in the Editorial tab', `${siteUrl()}/admin`)}`);
}

export function notifyPartnerPiece(to: string[], partnerName: string, title: string, outcome: 'accepted' | 'changes' | 'live', note: string, storyId?: string) {
    const copy = {
        accepted: { subject: `Your piece "${title}" is in the editing queue`, heading: 'We loved it', body: `Thank you for writing for The Unpack. Your piece <strong>${esc(title)}</strong> is accepted. We will edit it lightly and publish it soon. You will get another email when it is live.` },
        changes: { subject: `A few notes on your piece "${title}"`, heading: 'A few notes', body: `Thank you for sending <strong>${esc(title)}</strong>. Before we can publish it, we would like you to take another look:` },
        live: { subject: `Your piece "${title}" is live on The Unpack`, heading: 'Your piece is live', body: `<strong>${esc(title)}</strong> is now live on The Unpack. Share it with your community!` },
    }[outcome];
    const button = outcome === 'live' && storyId ? renderEmailButton('Read it on The Unpack', `${siteUrl()}/zine/${storyId}`) : outcome === 'changes' ? renderEmailButton('Open the festival portal', `${siteUrl()}/partner`) : '';
    return send(to, copy.subject, copy.heading,
        `<p style="font-size:14px;">${copy.body}</p>
         ${note ? `<p style="font-size:14px;background:#f4f4f4;padding:12px 16px;border-radius:8px;white-space:pre-wrap;">${esc(note)}</p>` : ''}
         ${button}
         <p style="margin:20px 0 0;font-size:12px;color:#999;">${esc(partnerName)} · Crate TV</p>`);
}

export function notifyOwnerMailReceived(fromLabel: string, subject: string, preview: string) {
    return send(ownerEmails(), `New email from ${fromLabel}`, 'You have a new email',
        `<p style="font-size:14px;"><strong>${esc(fromLabel)}</strong> wrote to your Crate TV mailbox:</p>
         <p style="font-size:14px;font-weight:bold;">${esc(subject)}</p>
         <p style="font-size:14px;background:#f4f4f4;padding:12px 16px;border-radius:8px;white-space:pre-wrap;">${esc(preview.slice(0, 280))}${preview.length > 280 ? '…' : ''}</p>
         ${renderEmailButton('Open Studio Mail', `${siteUrl()}/admin`)}`);
}
