// Emails a post-party engagement report to every verified filmmaker
// credited on a block's films, the moment that block's watch party ends
// (called from terminate-watch-party.ts and auto-end-watch-party.ts).
// Fire-and-forget by design — callers wrap this in try/catch so a report
// failure never blocks the actual party-ending flow.

import { Firestore } from 'firebase-admin/firestore';
import { Movie } from '../../types.js';
import { getCreditedNames, normalize } from './creditMatch.js';
import { computeWatchPartyStats } from './watchPartyStats.js';
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';

export async function sendWatchPartyReport(db: Firestore, blockId: string, blockTitle: string, movieKeys: string[]) {
    if (!movieKeys || movieKeys.length === 0) return;

    const stats = await computeWatchPartyStats(db, blockId);
    // No session data at all — likely a test run or the feature wasn't
    // actually used for this block. Don't send a confusing "0 viewers" email.
    if (stats.uniqueViewers === 0) return;

    const [movieDocs, filmmakersSnap] = await Promise.all([
        Promise.all(movieKeys.map(key => db.collection('movies').doc(key).get())),
        db.collection('users').where('isFilmmaker', '==', true).get(),
    ]);

    const movies = movieDocs.filter(d => d.exists).map(d => ({ key: d.id, ...d.data() } as Movie));

    // Match on verifiedFilmmakerName, not the freely-editable `name` field —
    // same identity source get-filmmaker-analytics.ts trusts, for the same
    // reason (a renamed account shouldn't redirect someone else's report).
    const emailByNormalizedName = new Map<string, string>();
    filmmakersSnap.forEach(doc => {
        const data = doc.data();
        const verifiedName = data.verifiedFilmmakerName || data.name;
        if (verifiedName && data.email) emailByNormalizedName.set(normalize(verifiedName), data.email);
    });

    const recipientEmails = new Set<string>();
    for (const movie of movies) {
        for (const rawName of getCreditedNames(movie)) {
            const email = emailByNormalizedName.get(normalize(rawName));
            if (email) recipientEmails.add(email);
        }
    }

    if (recipientEmails.size === 0) return; // no verified filmmaker account matched anyone credited

    const filmTitles = movies.map(m => m.title).filter(Boolean).join(', ');
    const dashboardUrl = `${process.env.VITE_APP_URL || 'https://cratetv.net'}/filmmaker-dashboard`;

    const bodyHtml = `
        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Watch Party Report</p>
        <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#1a1a1a;text-transform:uppercase;line-height:1.1;">${blockTitle}</h1>
        <p style="margin:0 0 16px;font-size:14px;">Your screening just wrapped. Here's how it went:</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:8px 0;font-size:14px;color:#555;">Peak concurrent viewers</td><td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right;">${stats.peakConcurrentViewers}</td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#555;">Total unique viewers</td><td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right;">${stats.uniqueViewers}</td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#555;">Average watch time</td><td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right;">${stats.averageWatchMinutes} min</td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:12px;color:#888;">Films in this block: ${filmTitles}</p>
        ${renderEmailButton('View Filmmaker Dashboard', dashboardUrl)}
    `;

    await Promise.allSettled(Array.from(recipientEmails).map(email =>
        resend.emails.send({
            from: `Crate TV <${fromEmail}>`,
            to: email,
            subject: `Your watch party report: ${blockTitle}`,
            html: renderBrandedEmail({ title: 'Watch Party Report', bodyHtml }),
        })
    ));
}
