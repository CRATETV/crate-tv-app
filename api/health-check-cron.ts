// api/health-check-cron.ts
//
// Runs on a schedule (see vercel.json) and checks for the specific
// classes of problem that have actually bitten Crate TV this week:
//   1. A watch party stuck in status:'live' way longer than any real
//      screening should run — the exact "banner still shows live" /
//      "party never got cleanly ended" pattern.
//   2. A spike in server errors in the last check window — and
//      specifically anything mentioning "permission", since that's the
//      exact signature of the "no one could log in" incident.
//   3. Firestore itself being unreachable (implicit — if the checks
//      above can't even run, that's alarming on its own and gets
//      reported as its own failure).
//
// Only sends an email when something's actually wrong — a healthy site
// stays silent. That's deliberate: an alert you get every 15 minutes
// stops being an alert.
//
// Configure in vercel.json:
//   { "path": "/api/health-check-cron", "schedule": "*/15 * * * *" }
// (every 15 minutes — adjust freely; more often = faster warning, more
// Firestore reads)

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';

// A real screening (even a big multi-film block) should never genuinely
// run longer than this. Past this, "still live" almost certainly means
// "never got cleanly ended," not "still actually playing."
const STUCK_LIVE_THRESHOLD_HOURS = 6;

// How far back to look for a server-error spike each run. Should be a
// bit more than the cron interval so a run that's slightly late doesn't
// leave a gap.
const ERROR_LOOKBACK_MINUTES = 20;
const ERROR_COUNT_ALERT_THRESHOLD = 5;

interface Issue {
    severity: 'warning' | 'critical';
    summary: string;
    detail: string;
}

export async function GET(request: Request) {
    // Verify it's actually Vercel calling this, not the public internet
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const issues: Issue[] = [];

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        // ── Check 1: watch parties stuck live ──────────────────────────
        const liveSnap = await db.collection('watch_parties').where('status', '==', 'live').get();
        const now = Date.now();
        liveSnap.forEach(doc => {
            const d = doc.data();
            const startedAt = d.actualStartTime?.toDate?.() || d.filmStartTime?.toDate?.();
            if (!startedAt) return; // no timestamp to judge by — skip rather than guess
            const hoursLive = (now - startedAt.getTime()) / (1000 * 60 * 60);
            if (hoursLive > STUCK_LIVE_THRESHOLD_HOURS) {
                issues.push({
                    severity: 'warning',
                    summary: `Watch party "${doc.id}" has been live for ${hoursLive.toFixed(1)} hours`,
                    detail: `Started ${startedAt.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET. This almost always means it needs to be manually ended from the admin Watch Party tab — real screenings don't run this long.`,
                });
            }
        });

        // ── Check 2: recent server error spike / permission errors ────
        const lookbackCutoff = new Date(now - ERROR_LOOKBACK_MINUTES * 60 * 1000);
        const errorSnap = await db.collection('error_logs')
            .where('timestamp', '>=', lookbackCutoff)
            .get();

        const permissionErrors = errorSnap.docs.filter(doc => {
            const msg = (doc.data().message || '').toLowerCase();
            return msg.includes('permission') || msg.includes('unauthorized') || msg.includes('insufficient');
        });

        if (permissionErrors.length > 0) {
            const sources = [...new Set(permissionErrors.map(d => d.data().source || 'unknown'))];
            issues.push({
                severity: 'critical',
                summary: `${permissionErrors.length} permission error${permissionErrors.length === 1 ? '' : 's'} in the last ${ERROR_LOOKBACK_MINUTES} minutes`,
                detail: `Sources: ${sources.join(', ')}. This is the same signature as the "no one could log in" incident — worth checking Firestore security rules and the specific endpoint(s) above right away.`,
            });
        } else if (errorSnap.size >= ERROR_COUNT_ALERT_THRESHOLD) {
            const sources = [...new Set(errorSnap.docs.map(d => d.data().source || 'unknown'))];
            issues.push({
                severity: 'warning',
                summary: `${errorSnap.size} server errors in the last ${ERROR_LOOKBACK_MINUTES} minutes (higher than usual)`,
                detail: `Sources: ${sources.join(', ')}. Worth a look in the admin Error Log tab.`,
            });
        }

    } catch (error) {
        // If the health check itself can't even run, that's worth knowing
        // about too — Firestore being unreachable is exactly the kind of
        // thing this is supposed to catch.
        issues.push({
            severity: 'critical',
            summary: 'The health check itself failed to run',
            detail: (error as Error).message || 'Unknown error',
        });
    }

    if (issues.length === 0) {
        return new Response(JSON.stringify({ ok: true, issues: 0 }), { status: 200 });
    }

    // Something's wrong — send the alert email
    try {
        const db = getAdminDb();
        let technicalEmail = FALLBACK_ADMIN;
        if (db) {
            const settingsDoc = await db.collection('content').doc('settings').get();
            technicalEmail = settingsDoc.data()?.technicalEmail || FALLBACK_ADMIN;
        }

        const hasCritical = issues.some(i => i.severity === 'critical');
        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:${hasCritical ? '#ef4444' : '#f59e0b'};">
                ${hasCritical ? 'Critical' : 'Warning'} — Automated Health Check
            </p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;text-transform:uppercase;">${issues.length} issue${issues.length === 1 ? '' : 's'} found</h1>
            ${issues.map(i => `
                <div style="margin:0 0 20px;padding:16px;border-left:3px solid ${i.severity === 'critical' ? '#ef4444' : '#f59e0b'};background:rgba(255,255,255,0.03);">
                    <p style="margin:0 0 6px;font-weight:900;font-size:14px;">${i.summary}</p>
                    <p style="margin:0;font-size:13px;color:#999;">${i.detail}</p>
                </div>
            `).join('')}
            <p style="margin:24px 0 0;font-size:11px;color:#666;">Checked ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
        `;

        await resend.emails.send({
            from: `Crate TV Alerts <${FROM_EMAIL}>`,
            to: [technicalEmail],
            subject: `${hasCritical ? '🚨' : '⚠️'} Crate TV: ${issues.length} issue${issues.length === 1 ? '' : 's'} found`,
            html: renderBrandedEmail({ title: 'Automated Health Check', bodyHtml }),
        });
    } catch (emailError) {
        console.error('[health-check-cron] Failed to send alert email:', emailError);
    }

    return new Response(JSON.stringify({ ok: false, issues: issues.length, details: issues }), { status: 200 });
}
