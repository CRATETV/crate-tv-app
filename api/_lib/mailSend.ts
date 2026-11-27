// api/_lib/mailSend.ts
//
// Builds and sends one Crate-branded email, and keeps a copy in the dashboard Sent folder.
// Used by "Send now" (api/send-individual-email.ts) and by the timed-send job
// (api/send-scheduled-mail.ts), so both look exactly the same.
import { Resend } from 'resend';
import type { Firestore } from 'firebase-admin/firestore';
import { MAIL_COLLECTION, SIGNATURES_DOC, replyToAddress, buildSentRecord, stripHtml, normalizeSignatures, renderSignatureHtml } from './mailLog.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_FROM = 'studio@cratetv.net';
// This is the dark header bar (#0a0a0a below), so it needs the white/light
// logo (logo-tagline.png), not crate-logo-email.png — that one is dark text,
// meant for a light background, and would be nearly invisible here. Also
// worth knowing: crate-logo-email.png didn't even exist in production until
// now (a confirmed 404), so this file's logo has never actually rendered for
// anyone before this fix.
const LOGO_URL = 'https://cratetv.net/email-logo-on-dark.png';


export interface DeliverArgs {
    email: string; subject: string; htmlBody: string;
    signatureId?: string;
    movieTitle?: string; posterUrl?: string; synopsis?: string; movieKey?: string;
    files?: { filename: string; content: Buffer; size: number }[];
    /** When set, this existing Sent record is updated instead of a new one being added. */
    existingRecordId?: string;
}

export async function deliverEmail(db: Firestore, a: DeliverArgs): Promise<void> {
    const { email, subject, htmlBody, signatureId, movieTitle, posterUrl, synopsis, movieKey } = a;
    const files = a.files || [];
        // 3. Fetch professional identity and signature from settings
        const settingsDoc = await db.collection('content').doc('settings').get();
        const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
        
        const businessEmail = settingsData?.businessEmail || FALLBACK_FROM;
        // A signature picked in Studio Mail ('none' = no signature). Callers that
        // don't pick one keep the old behavior: the single site-wide signature.
        const legacySignature = settingsData?.emailSignature || "";
        let signatureHtml = '';
        let signaturePlain = '';
        if (typeof signatureId === 'string' && signatureId) {
            if (signatureId !== 'none') {
                const sigDoc = await db.doc(SIGNATURES_DOC).get();
                const chosen = normalizeSignatures(sigDoc.data()?.list).find(s => s.id === signatureId);
                if (!chosen) {
                    throw new Error('That signature no longer exists.');
                }
                signatureHtml = renderSignatureHtml(chosen);
                signaturePlain = chosen.text;
            }
        }
        const signature = signatureId ? '' : legacySignature;

        // 5. Content Preparation
        const plainText = htmlBody.replace(/<[^>]+>/g, '').trim() + (signaturePlain ? `\n\n--\n${signaturePlain}` : '');

        // 6. Execute Transmission via Resend
        const { data: sent, error } = await resend.emails.send({
            from: `Crate TV <${businessEmail}>`,
            to: [email],
            subject: subject,
            // Replies go to the dashboard mailbox when it has been set up (MAIL_INBOUND_ADDRESS).
            reply_to: replyToAddress({ MAIL_INBOUND_ADDRESS: process.env.MAIL_INBOUND_ADDRESS }, businessEmail),
            text: plainText,
            attachments: files.length ? files.map(f => ({ filename: f.filename, content: f.content })) : undefined,
            html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta name="color-scheme" content="light dark">
                    <meta name="supported-color-schemes" content="light dark">
                    <title>${subject}</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

                                    <!-- Dark Header Bar with Logo -->
                                    <tr>
                                        <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 32px 40px;">
                                            <a href="https://cratetv.net" target="_blank">
                                                <img src="${LOGO_URL}" alt="Crate TV" width="130" style="display: block; border: 0;">
                                            </a>
                                        </td>
                                    </tr>

                                    <!-- Red accent line -->
                                    <tr>
                                        <td bgcolor="#ef4444" style="background-color: #ef4444; height: 3px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                                    </tr>

                                    <!-- Core Content -->
                                    <tr>
                                        <td style="padding: 40px 40px 32px; background-color: #ffffff;" bgcolor="#ffffff">
                                            <div style="font-size: 16px; line-height: 1.8; color: #1a1a1a;">
                                                ${htmlBody}
                                            </div>

                                            ${posterUrl ? `
                                            <!-- Film Block -->
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
                                                <tr>
                                                    <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a;">
                                                        <img src="${posterUrl}" alt="${movieTitle}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block;">
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 32px 40px;">
                                                        <p style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 12px 0;">Official Selection</p>
                                                        <h3 style="margin: 0 0 16px 0; color: #ffffff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; line-height: 1.1;">${movieTitle}</h3>
                                                        <p style="color: #999999; font-size: 14px; margin: 0 0 28px 0; font-style: italic; line-height: 1.6;">
                                                            ${synopsis ? synopsis.replace(/<[^>]+>/g, '').substring(0, 180) + '...' : ''}
                                                        </p>
                                                        <a href="https://cratetv.net/movie/${movieKey}?play=true" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                                                            ▶ Stream Now
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            ` : ''}

                                            ${signatureHtml ? `
                                            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5; color: #555555; font-size: 14px; line-height: 1.7;">
                                                ${signatureHtml}
                                            </div>
                                            ` : ''}

                                            ${signature ? `
                                            <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e5e5; color: #555555; font-size: 14px; font-style: italic; white-space: pre-wrap; line-height: 1.7;">
                                                ${signature}
                                            </div>
                                            ` : ''}
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 28px 40px;">
                                            <p style="font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; margin: 0 0 8px 0;">Independent film, streaming worldwide</p>
                                            <p style="font-size: 9px; color: #444444; margin: 0;">© ${new Date().getFullYear()} Crate TV. Philadelphia, PA // NYC.</p>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
        });

        if (error) throw new Error(`Resend Cloud Error: ${error.message}`);

        // Keep a copy in the dashboard Sent folder. If saving the copy fails the
        // email has still gone out, so this never turns into an error.
        try {
            const record = buildSentRecord({
                resendId: sent?.id, fromEmail: businessEmail, to: email, subject,
                text: stripHtml(htmlBody.replace(/<br\s*\/?>/gi, '\n')), files, movieTitle, nowIso: new Date().toISOString(),
            });
            if (a.existingRecordId) await db.collection(MAIL_COLLECTION).doc(a.existingRecordId).set(record);
            else await db.collection(MAIL_COLLECTION).add(record);
        } catch (logErr) {
            console.error('[Crate API] Sent copy not saved:', logErr);
        }

}
