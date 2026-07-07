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
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';

export async function POST(request: Request) {
    try {
        const { password, emails, festivalName, festivalYear, accessType, blockId, blockTitle } = await request.json();
        // accessType: 'full' = full festival pass, 'block' = specific block only

        const ip = getIP(request);
        if (!rateLimit(ip, 5, 60 * 60 * 1000)) {
            return new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), { status: 429 });
        }

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
                const bodyHtml = `
                    <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-0.5px;">Your Virtual Pass is Ready</h1>
                    <p style="margin:0 0 14px;text-align:center;">${accessType === 'block'
                        ? `You have been granted access to <strong>${blockTitle}</strong> at ${name} ${year} streaming live on Crate TV.`
                        : `You have been granted a full virtual pass to <strong>${name} ${year}</strong> streaming live on Crate TV.`
                    }</p>
                    <p style="margin:0 0 28px;text-align:center;">Simply log in or create a free account at cratetv.net using <strong>${email}</strong> and your festival access will be waiting for you automatically.</p>
                    ${renderEmailButton('Access The Festival', 'https://cratetv.net')}
                    <p style="margin:24px 0 0;font-size:12px;color:#999999;text-align:center;">Already have a Crate account? Just log in.<br>New to Crate? Sign up free — your festival access activates automatically.</p>
                    <p style="margin:20px 0 0;font-size:11px;color:#bbbbbb;text-align:center;">This invitation was sent to ${email}.</p>
                `;
                await resend.emails.send({
                    from: 'CrateTV <studio@cratetv.net>',
                    to: email,
                    subject: accessType === 'block'
                        ? `Your Ticket to "${blockTitle}" at ${name} ${year} is Ready`
                        : `Your Virtual Pass to ${name} ${year} is Ready`,
                    html: renderBrandedEmail({
                        title: `Your Virtual Pass to ${name} ${year}`,
                        bodyHtml,
                        footerTagline: `${name} ${year}`,
                    }),
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
