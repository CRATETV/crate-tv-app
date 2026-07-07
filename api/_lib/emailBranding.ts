// ── SHARED EMAIL BRANDING ────────────────────────────────────────────────
// Extracted from send-individual-email.ts, which already had the best-looking
// template in the codebase (dark header + logo, red accent line, clean white
// body, consistent footer) — but it was the only one built that carefully.
// Of the 25 places this app sends email, only 4 included the Crate TV logo
// at all; the rest were plain, unbranded text. That's the actual gap between
// "functional" and "professional and spectacular" for anything a filmmaker,
// ticket holder, or festival attendee receives in their inbox.
//
// Using ONE shared wrapper here means every email looks like it came from
// the same real company, and a future rebrand/color change/logo swap is one
// edit instead of twenty.
//
// Usage:
//   import { renderBrandedEmail } from './_lib/emailBranding.js';
//   const html = renderBrandedEmail({ title: 'Your ticket is confirmed', bodyHtml: `<p>...</p>` });

// There are two real logo files, and they are NOT interchangeable:
//   - LOGO_URL (crate-logo-email.png) is dark/charcoal text — only visible on a
//     LIGHT background.
//   - LOGO_URL_ON_DARK (logo-tagline.png) is white text with the tagline baked
//     in — for DARK backgrounds, which is what nearly every email here uses
//     (the shared dark header bar below, and every email with a dark theme).
// This distinction matters because the file this constant originally pointed
// at didn't exist in production at all (a confirmed 404), so earlier code
// here was written on an untested assumption about which one it was. Now that
// the real files are in hand, it turned out backwards: several emails were
// using the dark-on-light logo directly on a dark background (invisible),
// and a couple were applying filter:invert(1) to try to compensate, which
// made an already-dark logo invisible on a LIGHT background instead.
export const LOGO_URL = 'https://cratetv.net/crate-logo-email.png';
export const LOGO_URL_ON_DARK = 'https://cratetv.net/logo-tagline.png';

export interface BrandedEmailOptions {
    /** Used as the <title> tag — not shown in the body, but shows in some mail-client tab/preview UI. */
    title: string;
    /** Main content — already-formatted HTML, will be dropped into the white content area. */
    bodyHtml: string;
    /** Optional — overrides the default footer tagline line (e.g. for festival-specific emails). */
    footerTagline?: string;
}

export const renderBrandedEmail = ({ title, bodyHtml, footerTagline }: BrandedEmailOptions): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${title}</title>
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
                                <img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="130" style="display: block; border: 0;">
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
                                ${bodyHtml}
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" bgcolor="#0a0a0a" style="background-color: #0a0a0a; padding: 28px 40px;">
                            <p style="font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; margin: 0 0 8px 0;">${footerTagline || 'Global Independent Infrastructure'}</p>
                            <p style="font-size: 9px; color: #444444; margin: 0;">© ${new Date().getFullYear()} Crate TV. Philadelphia, PA // NYC.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

/** Standard CTA button, styled to match the shared template — for emails that need one big "click here" action. */
export const renderEmailButton = (text: string, url: string): string => `
<table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding-top: 8px;">
    <a href="${url}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
        ${text}
    </a>
</td></tr></table>
`;
