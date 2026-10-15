// api/health-check-cron.ts
//
// THE CRATE TV "ALERT ROBOT": check → fix what's safe → email a report.
//
// WHEN IT RUNS
//   Every 15 minutes, by Vercel (see "crons" in vercel.json). Free: it uses
//   the Vercel cron, Firestore and Resend you already have.
//   Also on demand: admin → Error Log → "Run health check now" (that one
//   always emails, even when everything is fine, so you can see it works).
//
// WHAT IT CHECKS, AND WHAT IT DOES ABOUT IT
//   1. Watch parties stuck on "live"
//        Live 6h+ and nothing happened in them for 4h+  → ENDED automatically,
//        exactly like the admin "End Party" button (homepage banner cleared,
//        festival block stamped, filmmaker report sent).
//        Live 6h+ but still active                      → reported only.
//   2. Ticket sales that charged the customer but didn't save to the ticket
//      list (festival_tickets)                          → RESTORED automatically,
//        once (a fixed document id makes a second copy impossible).
//        If the error doesn't hold enough detail        → reported only.
//   3. Errors in the last 20 minutes                    → reported, grouped,
//        with what they probably mean and what to do. Normal background noise
//        (a viewer's Wi-Fi dropping) is ignored unless there's a lot of it.
//   4. Once an hour: is the site up, and does the Roku catalogue load?
//                                                        → reported only.
//   5. If the check itself can't run (database unreachable) → reported.
//
//   The rules and thresholds live in api/_lib/healthRules.ts (with notes).
//
// EMAILS
//   - Sent to the "technical email" in admin settings (content/settings →
//     technicalEmail), or cratetiv@gmail.com if that's empty.
//   - Silent when nothing is wrong.
//   - The same unfixed problem is re-sent at most every 6 hours
//     (memory kept in Firestore: system/health_check).
//   - Every run that found something is saved in `health_reports`.
//
// SECURITY
//   GET  = Vercel's cron only (needs CRON_SECRET, set automatically by Vercel).
//   POST = admin password only.

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { finalizeEndedParty, toMillis } from './_lib/watchPartyLifecycle.js';
import { setBackstageKey } from './_lib/backstage.js';
import {
    decideStuckParty, recoveredTicketRecord, recoveredTicketDocId, errorItems, shouldSend,
    reportSubject, reportHtml, ERROR_LOOKBACK_MS, TICKET_RECOVERY_LOOKBACK_MS,
    type ReportItem, type ErrorFacts,
} from './_lib/healthRules.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const FALLBACK_ADMIN = 'cratetiv@gmail.com';
const SITE_URL = 'https://cratetv.net';

const etTime = (ms: number) => new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York' });

// ─────────────────────────────────────────────────────────────────────────
// Entry points
// ─────────────────────────────────────────────────────────────────────────

/** Vercel cron, every 15 minutes. */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    // Fail closed: if CRON_SECRET isn't set, nobody gets in.
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    const result = await runHealthCheck({ alwaysEmail: false });
    return json(result);
}

/** Admin "Run health check now" button. Always emails a report. */
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({} as any));
    if (!(await verifyAdminPassword(body?.password))) {
        return json({ error: 'Unauthorized' }, 401);
    }
    const result = await runHealthCheck({ alwaysEmail: true });
    return json(result);
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ─────────────────────────────────────────────────────────────────────────
// The check
// ─────────────────────────────────────────────────────────────────────────

export async function runHealthCheck(opts: { alwaysEmail: boolean }) {
    const now = Date.now();
    const items: ReportItem[] = [];
    let db: Firestore | null = null;

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        // Each check is wrapped on its own so one failing doesn't stop the rest.
        await guard(items, 'stuck watch parties', () => checkStuckParties(db!, now, items));
        await guard(items, 'ticket sales', () => restoreLostTickets(db!, now, items));
        await guard(items, 'error log', () => checkErrors(db!, now, items));
        // Hourly (the first run of each hour), to keep outside requests low.
        if (opts.alwaysEmail || new Date(now).getUTCMinutes() < 15) {
            await guard(items, 'site and Roku feed', () => checkSiteUp(items));
        }
    } catch (error) {
        items.push({
            key: 'health-check:failed',
            severity: 'critical',
            summary: 'The health check could not reach the database',
            detail: (error as Error).message || 'Unknown error',
            todo: 'Open cratetv.net. If films or logins are not working, check status.firebase.google.com and the Vercel dashboard.',
        });
    }

    // Decide what's new enough to email (don't repeat the same problem every 15 min).
    const lastSent: Record<string, number> = {};
    if (db) {
        const state = await db.collection('system').doc('health_check').get().catch(() => null);
        Object.assign(lastSent, state?.data()?.lastSent || {});
    }
    const toSend = opts.alwaysEmail ? items : items.filter(i => shouldSend(i, lastSent[i.key], now));

    let emailed = false;
    if (toSend.length > 0 || opts.alwaysEmail) {
        emailed = await sendReport(db, toSend, now);
        if (emailed && db) {
            const update: Record<string, number> = {};
            for (const i of toSend) if (i.severity !== 'fixed') update[i.key] = now;
            // Forget problems that have gone away, so if they come back you hear about it.
            const stillOpen = new Set(items.map(i => i.key));
            const merged: Record<string, number> = {};
            for (const [k, v] of Object.entries({ ...lastSent, ...update })) if (stillOpen.has(k)) merged[k] = v;
            await db.collection('system').doc('health_check').set({ lastSent: merged, lastRunAt: now }, { merge: false }).catch(() => {});
        }
    } else if (db) {
        // Nothing to email. Still forget problems that have cleared up.
        const stillOpen = new Set(items.map(i => i.key));
        const merged: Record<string, number> = {};
        for (const [k, v] of Object.entries(lastSent)) if (stillOpen.has(k)) merged[k] = v;
        await db.collection('system').doc('health_check').set({ lastSent: merged, lastRunAt: now }, { merge: false }).catch(() => {});
    }

    if (db && items.length > 0) {
        await db.collection('health_reports').add({
            at: FieldValue.serverTimestamp(),
            items,
            emailed,
            manual: opts.alwaysEmail,
        }).catch(() => {});
    }

    return {
        ok: items.every(i => i.severity === 'fixed' || i.severity === 'info'),
        fixed: items.filter(i => i.severity === 'fixed').length,
        problems: items.filter(i => i.severity === 'critical' || i.severity === 'warning').length,
        emailed,
        items,
    };
}

async function guard(items: ReportItem[], name: string, fn: () => Promise<void>) {
    try { await fn(); }
    catch (e) {
        items.push({
            key: `check-failed:${name}`,
            severity: 'warning',
            summary: `The "${name}" check could not run`,
            detail: (e as Error).message || 'Unknown error',
            todo: 'Usually temporary. If it repeats, send this email to Claude.',
        });
    }
}

// ── 1. Watch parties stuck on "live" ────────────────────────────────────
async function checkStuckParties(db: Firestore, now: number, items: ReportItem[]) {
    const snap = await db.collection('watch_parties').where('status', '==', 'live').get();
    for (const doc of snap.docs) {
        const d = doc.data();
        const startedMs = toMillis(d.actualStartTime) ?? toMillis(d.filmStartTime);
        const activity = [toMillis(d.filmStartTime), toMillis(d.lastUpdated), toMillis(d.actualStartTime)]
            .filter((v): v is number => v != null);
        const lastActivityMs = activity.length ? Math.max(...activity) : null;
        const decision = decideStuckParty({ id: doc.id, startedMs, lastActivityMs }, now);
        if (decision === 'ok') continue;

        const hours = ((now - (startedMs as number)) / 3_600_000).toFixed(1);
        if (decision === 'end') {
            // Same steps as admin "End Party" (api/terminate-watch-party.ts).
            await doc.ref.set({
                status: 'ended',
                isPlaying: false,
                actualStartTime: null,
                currentTime: 0,
                backstageKey: null,
                lastUpdated: FieldValue.serverTimestamp(),
                endedAt: FieldValue.serverTimestamp(),
                endedBy: 'health-check',
            }, { merge: true });
            await setBackstageKey(db, doc.id, null);
            await finalizeEndedParty(db, doc.id);
            items.push({
                key: `party-ended:${doc.id}`,
                severity: 'fixed',
                summary: `Ended the watch party "${doc.id}". It was stuck on "live" for ${hours} hours`,
                detail: `It started ${etTime(startedMs as number)} ET and nothing had happened in it since ${etTime(lastActivityMs ?? (startedMs as number))} ET, so nothing could still be playing. It was ended the same way as the admin "End Party" button, so the "Live" banner is gone.`,
            });
        } else {
            items.push({
                key: `party-long:${doc.id}`,
                severity: 'warning',
                summary: `Watch party "${doc.id}" has been live for ${hours} hours`,
                detail: `Something happened in it recently (last activity ${etTime(lastActivityMs as number)} ET), so the robot left it alone. That's normal for a long festival day.`,
                todo: 'If it should be over, end it in admin → Watch Party. If you do nothing, the robot ends it once it has been quiet for 4 hours.',
            });
        }
    }
}

// ── 2. Ticket sales that didn't record ─────────────────────────────────
async function restoreLostTickets(db: Firestore, now: number, items: ReportItem[]) {
    // Asks only for this one kind of error (rare), so it costs almost no
    // database reads, then keeps the last 48 hours that aren't fixed yet.
    const since = now - TICKET_RECOVERY_LOOKBACK_MS;
    const snap = await db.collection('error_logs')
        .where('source', '==', 'api/process-square-payment:ticket-logging')
        .get();
    const lost = snap.docs.filter(d => !d.data().autoFixed && (toMillis(d.data().timestamp) ?? 0) >= since);

    for (const errDoc of lost) {
        const e = errDoc.data();
        const record = recoveredTicketRecord({ errorId: errDoc.id, timestampMs: toMillis(e.timestamp), context: e.context || null });
        const who = e.context?.email || 'a customer';
        const what = e.context?.itemId || 'unknown item';
        if (!record) {
            items.push({
                key: `ticket-unrestorable:${errDoc.id}`,
                severity: 'warning',
                summary: `A ticket sale (${who}, ${what}) didn't record and couldn't be restored automatically`,
                detail: 'The customer was charged and has access. Only your ticket count / revenue dashboard is missing this sale. The error did not hold enough detail to rebuild it safely.',
                todo: 'Find the payment in Square for that time and add it to the ticket list, or ask Claude to.',
            });
            continue;
        }
        const ref = db.collection('festival_tickets').doc(recoveredTicketDocId(errDoc.id));
        try {
            await ref.create({ ...record, purchasedAt: e.timestamp || FieldValue.serverTimestamp() });
        } catch (createErr: any) {
            // "already exists" means an earlier run restored it; anything else is a real failure.
            if (!String(createErr?.message || createErr?.code || '').toLowerCase().includes('already') && createErr?.code !== 6) throw createErr;
        }
        await errDoc.ref.update({ autoFixed: true, autoFixedAt: FieldValue.serverTimestamp() });
        items.push({
            key: `ticket-restored:${errDoc.id}`,
            severity: 'fixed',
            summary: `Restored a ticket sale that didn't record: ${who}, ${what} ($${Number(record.amountPaid).toFixed(2)})`,
            detail: 'The customer was charged and had access the whole time. The sale is now back in your ticket count and revenue dashboard.',
        });
    }
}

// ── 3. Errors in the last 20 minutes ───────────────────────────────────
async function checkErrors(db: Firestore, now: number, items: ReportItem[]) {
    const since = new Date(now - ERROR_LOOKBACK_MS);
    const snap = await db.collection('error_logs').where('timestamp', '>=', since).get();
    const errors: ErrorFacts[] = snap.docs
        .map(d => d.data())
        // Ticket-logging errors are handled (and reported) by check 2.
        .filter(d => !String(d.source || '').includes('ticket-logging'))
        .map(d => ({ source: String(d.source || 'unknown'), origin: String(d.origin || 'server'), message: String(d.message || '') }));
    items.push(...errorItems(errors, Math.round(ERROR_LOOKBACK_MS / 60000)));
}

// ── 4. Is the site up? Does the Roku catalogue load? ───────────────────
async function checkSiteUp(items: ReportItem[]) {
    const probe = async (url: string) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        try { return await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'CrateTV-HealthCheck' } }); }
        finally { clearTimeout(t); }
    };

    try {
        const home = await probe(`${SITE_URL}/`);
        if (!home.ok) throw new Error(`status ${home.status}`);
    } catch (e) {
        items.push({
            key: 'site-down',
            severity: 'critical',
            summary: 'cratetv.net did not load',
            detail: `The home page answered: ${(e as Error).message}.`,
            todo: 'Open cratetv.net yourself. If it is down, check the Vercel dashboard → Deployments; "Redeploy" the last working one if the newest failed.',
        });
        return; // no point checking the feed too
    }

    try {
        const feed = await probe(`${SITE_URL}/api/roku-feed`);
        if (!feed.ok) throw new Error(`status ${feed.status}`);
        const text = await feed.text();
        if (text.length < 200) throw new Error('the catalogue came back empty');
    } catch (e) {
        items.push({
            key: 'roku-feed-down',
            severity: 'critical',
            summary: 'The Roku catalogue did not load',
            detail: `cratetv.net/api/roku-feed answered: ${(e as Error).message}. Roku viewers will see an error or an empty channel.`,
            todo: 'Check admin → Error Log for "roku-feed". A recent film edit with a missing field is the usual cause.',
        });
    }
}

// ── Email ──────────────────────────────────────────────────────────────
async function sendReport(db: Firestore | null, items: ReportItem[], now: number): Promise<boolean> {
    try {
        let to = FALLBACK_ADMIN;
        if (db) {
            const settings = await db.collection('content').doc('settings').get().catch(() => null);
            to = settings?.data()?.technicalEmail || FALLBACK_ADMIN;
        }
        await resend.emails.send({
            from: `Crate TV Alerts <${FROM_EMAIL}>`,
            to: [to],
            subject: reportSubject(items),
            html: renderBrandedEmail({ title: 'Health check report', bodyHtml: reportHtml(items, etTime(now)) }),
        });
        return true;
    } catch (e) {
        console.error('[health-check] Failed to send report email:', e);
        return false;
    }
}
