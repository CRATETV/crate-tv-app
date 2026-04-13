/**
 * pwff-invite.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin pastes a list of emails. This API:
 *   1. Saves each email to pwff_invites collection with status "invited"
 *   2. Sends each person an invitation email via Resend
 *   3. When they sign up at cratetv.net with that email, AuthContext checks
 *      pwff_invites and auto-grants hasFestivalAllAccess
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAdminDb } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

export async function POST(request: Request) {
    try {
        const { password, emails, festivalName, festivalYear, accessType, blockId, blockTitle } = await request.json();
        // accessType: 'full' = full festival pass, 'block' = specific block only

        if (!password || (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const db = getAdminDb();
        if (!db) throw new Error('Database unavailable');

        const resend = new Resend(process.env.RESEND_API_KEY);
        const name = festivalName || 'Playhouse West Film Festival';
        const year = festivalYear || '2026';
        const results = { sent: 0, alreadyInvited: 0, errors: 0 };

        for (const rawEmail of emails) {
            const email = rawEmail.trim().toLowerCase();
            if (!email || !email.includes('@')) continue;

            // Check if already invited
            const existing = await db.collection('pwff_invites').doc(email).get();
            if (existing.exists) {
                results.alreadyInvited++;
                continue;
            }

            // Save invite record
            await db.collection('pwff_invites').doc(email).set({
                email,
                status: 'invited',
                invitedAt: new Date().toISOString(),
                festivalYear: year,
                accessType: accessType || 'full',
                blockId: blockId || null,
                blockTitle: blockTitle || null,
                accessGranted: false,
                watchedAt: null,
            });

            // Send invitation email
            try {
                await resend.emails.send({
                    from: 'CrateTV <studio@cratetv.net>',
                    to: email,
                    subject: accessType === 'block' 
                        ? `Your Ticket to "${blockTitle}" at ${name} ${year} is Ready`
                        : `Your Virtual Pass to ${name} ${year} is Ready`,
                    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f0f0">
<tr><td style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td bgcolor="#E50914" style="background:#E50914;padding:13px 28px;border-radius:10px 10px 0 0;">
    <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;">CRATETV &mdash; ${name}</p>
  </td></tr>
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
    <h1 style="margin:0 0 16px;color:#111111;font-size:26px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-0.5px;">Your Virtual Pass is Ready</h1>
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.8;text-align:center;">${accessType === 'block' 
        ? `You have been granted access to <strong>${blockTitle}</strong> at ${name} ${year} streaming live on Crate TV.`
        : `You have been granted a full virtual pass to <strong>${name} ${year}</strong> streaming live on Crate TV.`
    }</p>
    <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8;text-align:center;">Simply log in or create a free account at cratetv.net using <strong>${email}</strong> and your festival access will be waiting for you automatically.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr><td bgcolor="#E50914" style="background:#E50914;border-radius:8px;">
        <a href="https://cratetv.net" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase;">ACCESS THE FESTIVAL</a>
      </td></tr>
    </table>
    <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;line-height:1.6;">Already have a Crate account? Just log in.<br>New to Crate? Sign up free — your festival access activates automatically.</p>
  </td></tr>
  <tr><td bgcolor="#f8f8f8" style="background:#f8f8f8;padding:16px 32px;border-radius:0 0 10px 10px;border:1px solid #e0e0e0;border-top:none;">
    <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">This invitation was sent to ${email} &mdash; ${name} &times; Crate TV</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
                });
                results.sent++;
            } catch (emailErr) {
                console.error(`Failed to send to ${email}:`, emailErr);
                results.errors++;
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
