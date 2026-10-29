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
// Oct 2026: new CRATE logo. Both are wide PNGs (email apps can't show SVG);
// the old names (crate-logo-email.png, logo-tagline.png) also hold the new
// logo so emails sent before the change update too.
//
// Oct 23 2026: phone mail apps in dark mode (Gmail on iPhone especially)
// recolour emails — the black header turned light grey and the white logo
// vanished. Pictures are never recoloured, so the logo now always sits on
// its own "midnight glow" background baked into the image:
//   - email-header.png: the full-width header banner used by every email
//     built with renderBrandedEmail.
//   - the four logo files below are now a rounded logo "badge" (same shape
//     as before), so older one-off email templates — and emails already
//     sent — show the logo clearly on light or dark backgrounds.
export const LOGO_URL = 'https://cratetv.net/email-logo-on-light.png';
export const LOGO_URL_ON_DARK = 'https://cratetv.net/email-logo-on-dark.png';
export const HEADER_BANNER_URL = 'https://cratetv.net/email-header.png';

export interface BrandedEmailOptions {
    /** Used as the <title> tag — not shown in the body, but shows in some mail-client tab/preview UI. */
    title: string;
    /** Main content — already-formatted HTML, will be dropped into the white content area. */
    bodyHtml: string;
    /** Optional — overrides the default footer tagline line (e.g. for festival-specific emails). */
    footerTagline?: string;
}

export const EMAIL_WORDMARK_URL = 'https://cratetv.net/email-wordmark.png';

// Oct 29 2026 redesign (modelled on Pavilion+'s emails): one dark card, the CRATE
// wordmark sitting at the top-left with a thin line under it, no coloured banner.
// A dark card with an explicit background is also what phone mail apps leave alone
// in dark mode, so the white logo can't vanish.
//
// The ~30 emails that use this were written for a WHITE card (dark text, light grey
// boxes). Rather than rewrite them all, darkenEmailBody() flips those inline colors
// to their dark-card equivalents. Tested: tests/emailBranding.test.ts.
const TEXT_COLORS: Record<string, string> = {
    '#1a1a1a': '#f5f5f7', '#000': '#f5f5f7', '#000000': '#f5f5f7', black: '#f5f5f7', '#0a0a0a': '#f5f5f7', '#0d0d0d': '#f5f5f7', '#333': '#f5f5f7', '#333333': '#f5f5f7',
    '#444': '#c4c4cc', '#444444': '#c4c4cc', '#555': '#b4b4bc', '#555555': '#b4b4bc', '#666': '#b4b4bc', '#666666': '#b4b4bc',
    '#888': '#9d9da7', '#888888': '#9d9da7', '#999': '#9d9da7', '#999999': '#9d9da7', '#bbb': '#c8c8d0', '#bbbbbb': '#c8c8d0',
};
const PANEL_COLORS: Record<string, string> = { '#f4f4f4': '#2a2b30', '#f5f5f5': '#2a2b30', '#fafafa': '#2a2b30', '#ffffff': '#2a2b30', '#fff': '#2a2b30', white: '#2a2b30' };
const LINE_COLORS: Record<string, string> = { '#e5e5e5': '#34353b', '#eee': '#34353b', '#eeeeee': '#34353b', '#ddd': '#34353b', '#dddddd': '#34353b' };

/** Flip an email body written for a white card so it reads on the dark card. Colored accents and buttons are left alone. */
export const darkenEmailBody = (html: string): string =>
    html
        // text color (not background-color / border-color)
        .replace(/(^|[;"'\s])color\s*:\s*(#[0-9a-fA-F]{3,6}|black)\b/gi, (m, pre, c) => TEXT_COLORS[c.toLowerCase()] ? `${pre}color:${TEXT_COLORS[c.toLowerCase()]}` : m)
        // panels
        .replace(/background(-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|white)\b/gi, (m, _s, c) => PANEL_COLORS[c.toLowerCase()] ? `background${_s || ''}:${PANEL_COLORS[c.toLowerCase()]}` : m)
        .replace(/bgcolor="(#[0-9a-fA-F]{3,6})"/gi, (m, c) => PANEL_COLORS[c.toLowerCase()] ? `bgcolor="${PANEL_COLORS[c.toLowerCase()]}"` : m)
        // thin lines
        .replace(/(border[a-z-]*\s*:[^;"']*?)(#[0-9a-fA-F]{3,6})\b/gi, (m, pre, c) => LINE_COLORS[c.toLowerCase()] ? `${pre}${LINE_COLORS[c.toLowerCase()]}` : m);

export const renderBrandedEmail = ({ title, bodyHtml, footerTagline }: BrandedEmailOptions): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #121214; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#121214" style="background-color: #121214;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1f2023" style="max-width: 600px; background-color: #1f2023; border: 1px solid #2e2f35; border-radius: 20px; overflow: hidden;">

                    <!-- Logo: just the wordmark, top-left -->
                    <tr>
                        <td align="left" bgcolor="#1f2023" style="background-color: #1f2023; padding: 32px 40px 28px; border-bottom: 1px solid #2e2f35;">
                            <a href="https://cratetv.net" target="_blank" style="text-decoration: none;">
                                <img src="${EMAIL_WORDMARK_URL}" alt="CRATE TV" width="170" style="display: block; width: 170px; max-width: 60%; height: auto; border: 0;">
                            </a>
                        </td>
                    </tr>

                    <!-- Core Content -->
                    <tr>
                        <td style="padding: 40px 40px 36px; background-color: #1f2023;" bgcolor="#1f2023">
                            <div style="font-size: 16px; line-height: 1.75; color: #f5f5f7;">
                                ${darkenEmailBody(bodyHtml)}
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="left" bgcolor="#1f2023" style="background-color: #1f2023; padding: 24px 40px 32px; border-top: 1px solid #2e2f35;">
                            <p style="font-size: 12px; color: #8b8b95; margin: 0 0 6px 0; line-height: 1.5;">${footerTagline || 'Television powered by creatives'}</p>
                            <p style="font-size: 11px; color: #6f6f79; margin: 0; line-height: 1.5;">© ${new Date().getFullYear()} Crate TV · Philadelphia, PA // NYC · <a href="https://cratetv.net" style="color: #8b8b95;">cratetv.net</a></p>
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
    <a href="${url}" style="background-color: #FF3B5C; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
        ${text}
    </a>
</td></tr></table>
`;
