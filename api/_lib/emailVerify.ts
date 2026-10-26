// api/_lib/emailVerify.ts
//
// Anyone can create a Crate account with ANY email address; Firebase doesn't
// check it belongs to them unless they click a confirmation link. So wherever
// CRATE grants something because of an email address (a festival invite, a
// filmmaker's on-file email, tickets bought under that email), the email must
// be confirmed first. This sends the confirmation link.
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './emailBranding.js';
import { escapeHtml } from './validation.js';

export async function sendEmailConfirmation(auth: any, email: string, opts: { continueUrl: string; why: string }): Promise<boolean> {
    if (!process.env.RESEND_API_KEY || !email) return false;
    try {
        const link: string = await auth.generateEmailVerificationLink(email, { url: opts.continueUrl });
        await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: `CRATE TV <${process.env.FROM_EMAIL || 'noreply@cratetv.net'}>`,
            to: email,
            subject: 'Confirm your email for CRATE TV',
            html: renderBrandedEmail({
                title: 'Confirm your email',
                bodyHtml: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;">Confirm it's you</h1>
<p style="margin:0 0 16px;">${escapeHtml(opts.why)} Tap the button to confirm this is your email address.</p>
${renderEmailButton('Confirm my email', link)}
<p style="margin:16px 0 0;font-size:12px;color:#888;">Didn't ask for this? You can ignore this email.</p>`,
            }),
        });
        return true;
    } catch (e) {
        console.error('[emailVerify] could not send confirmation', e);
        return false;
    }
}
