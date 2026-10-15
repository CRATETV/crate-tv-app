// api/_lib/healthRules.ts
//
// THE CRATE TV "ALERT ROBOT": the rules that decide what's wrong, what may be
// fixed automatically, and what the report email says.
//
// These functions are pure (no database, no email), so they can be tested:
// see tests/health.test.ts. The part that actually reads the database, makes
// the fixes and sends the email is api/health-check-cron.ts.
//
// THE GOLDEN RULE
//   The robot only fixes things where the fix is the same thing you'd do by
//   hand in the admin and can't hurt anyone:
//     1. A watch party stuck on "live" long after anything could still be
//        playing -> ends it exactly like the admin "End Party" button.
//     2. A ticket sale that charged the customer but didn't make it into the
//        ticket list -> adds that one sale back (once, never twice).
//   Everything else is REPORTED in plain English with what it probably means
//   and what to do. It never changes prices, films, accounts, access,
//   payments or settings.
//
// TO CHANGE A THRESHOLD: edit the numbers just below. Nothing else needs to change.

export const HOUR = 60 * 60 * 1000;
export const MINUTE = 60 * 1000;

/** A live watch party older than this gets a closer look. */
export const STUCK_LIVE_AFTER_MS = 6 * HOUR;
/** ...and is ended automatically only if nothing has happened in it (film
 *  started, block advanced, host action) for this long. No film on Crate is
 *  4 hours long, so by then nothing can still be playing. */
export const NO_ACTIVITY_FOR_MS = 4 * HOUR;

/** How far back each 15-minute run looks for errors. A bit more than 15 min
 *  so a late run doesn't leave a gap. */
export const ERROR_LOOKBACK_MS = 20 * MINUTE;
/** How far back the robot looks for unrecorded ticket sales to restore. */
export const TICKET_RECOVERY_LOOKBACK_MS = 48 * HOUR;
/** Site-side errors in one window before it's worth an email. */
export const SITE_ERROR_ALERT_COUNT = 5;
/** Viewer-side errors (their Wi-Fi dropped, old tab after an update...) are
 *  normal in small numbers; this many in one window means something bigger. */
export const VIEWER_ERROR_ALERT_COUNT = 30;
/** The same unfixed problem is emailed at most once per this period, so a
 *  problem that lasts all day doesn't send 96 emails. */
export const REPEAT_ALERT_AFTER_MS = 6 * HOUR;

export type Severity = 'fixed' | 'critical' | 'warning' | 'info';

export interface ReportItem {
    /** Stable id for "have I already emailed about this?" (see shouldSend). */
    key: string;
    severity: Severity;
    summary: string;
    /** What it means, in plain English. */
    detail: string;
    /** What (if anything) you should do. Empty for things already fixed. */
    todo?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Watch parties stuck on "live"
// ─────────────────────────────────────────────────────────────────────────

export interface LivePartyFacts {
    id: string;
    startedMs: number | null;      // actualStartTime (or filmStartTime)
    lastActivityMs: number | null; // latest of filmStartTime / lastUpdated / actualStartTime
}

export type PartyDecision = 'ok' | 'end' | 'report';

/**
 * ok     : nothing unusual
 * end    : safe to end automatically (live 6h+ and nothing has happened for 4h+)
 * report : live 6h+ but something happened recently (maybe a long festival
 *          day), so a person should look
 */
export function decideStuckParty(p: LivePartyFacts, nowMs: number): PartyDecision {
    if (p.startedMs == null) return 'ok'; // no start time: can't judge, don't guess
    if (nowMs - p.startedMs < STUCK_LIVE_AFTER_MS) return 'ok';
    const last = p.lastActivityMs ?? p.startedMs;
    return nowMs - last >= NO_ACTIVITY_FOR_MS ? 'end' : 'report';
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Ticket sales that didn't get recorded
// ─────────────────────────────────────────────────────────────────────────

export interface TicketErrorFacts {
    errorId: string;
    timestampMs: number | null;
    context: Record<string, any> | null;
    alreadyFixed?: boolean;
}

/** The ticket-list record to restore, or null if the error doesn't hold
 *  enough to rebuild it safely (then it's reported for a person instead). */
export function recoveredTicketRecord(e: TicketErrorFacts): Record<string, any> | null {
    const c = e.context || {};
    const types = ['watchPartyTicket', 'block', 'movie'];
    if (!c.itemId || typeof c.itemId !== 'string') return null;
    if (!types.includes(c.paymentType)) return null;
    if (typeof c.amountPaid !== 'number' || !(c.amountPaid >= 0)) return null;
    // Records logged before Oct 2026 didn't save which partner festival the
    // sale belonged to. Guessing could pay the wrong festival, so those are
    // left for a person.
    if (!('partnerId' in c)) return null;
    return {
        itemId: c.itemId,
        paymentType: c.paymentType,
        note: typeof c.note === 'string' && c.note ? c.note : `Restored by the health check (error ${e.errorId})`,
        amountPaid: c.amountPaid,
        email: typeof c.email === 'string' ? c.email : null,
        promoCode: typeof c.promoCode === 'string' ? c.promoCode : null,
        isWatchParty: c.paymentType === 'watchPartyTicket',
        isFestivalBlock: c.paymentType === 'block',
        uid: typeof c.uid === 'string' ? c.uid : null,
        partnerId: typeof c.partnerId === 'string' ? c.partnerId : null,
        restoredAutomatically: true,
        restoredFromErrorId: e.errorId,
        // purchasedAt is set by the caller from the error's own time
    };
}

/** Document id for a restored sale. Using a fixed id means running twice
 *  can never add the same sale twice. */
export const recoveredTicketDocId = (errorId: string) => `recovered-${errorId}`;

// ─────────────────────────────────────────────────────────────────────────
// 3. Errors: sort, group and explain
// ─────────────────────────────────────────────────────────────────────────

export interface ErrorFacts {
    source: string;
    origin: string;   // 'client' | 'server'
    message: string;
}

/** Errors caused by the viewer's own device or connection, not by Crate. */
const VIEWER_SIDE = [
    'failed to fetch', 'networkerror', 'load failed', 'network request failed',
    'loading chunk', 'chunkloaderror', 'dynamically imported module',
    'resizeobserver loop', 'aborterror', 'the user aborted', 'play() request was interrupted',
    'notallowederror', 'the operation was aborted', 'quota exceeded',
];

export function isViewerSide(e: ErrorFacts): boolean {
    if (e.origin !== 'client') return false;
    const m = (e.message || '').toLowerCase();
    return VIEWER_SIDE.some(p => m.includes(p));
}

export function isPermissionError(e: ErrorFacts): boolean {
    const m = (e.message || '').toLowerCase();
    return m.includes('permission') || m.includes('unauthorized') || m.includes('insufficient');
}

/** Plain-English meaning + what to do, for the patterns we've seen before. */
export function explainError(e: ErrorFacts): { meaning: string; todo: string } {
    const m = (e.message || '').toLowerCase();
    const s = (e.source || '').toLowerCase();
    if (isPermissionError(e)) return {
        meaning: 'The database refused a request. This is the same signature as the "no one could log in" incident.',
        todo: 'Try logging in on cratetv.net yourself. If that fails, check Firestore rules (firestore.rules) were not changed, and the Firebase console for outages.',
    };
    if (m.includes('loading chunk') || m.includes('dynamically imported module')) return {
        meaning: 'Someone had cratetv.net open from before the last update, so their browser asked for a file that no longer exists.',
        todo: 'Nothing. Refreshing the page fixes it for them.',
    };
    if (isViewerSide(e)) return {
        meaning: "The viewer's connection or browser dropped a request.",
        todo: 'Nothing, unless many people report it at once. Then check vercel-status.com and status.firebase.google.com.',
    };
    if (s.includes('square') || s.includes('payment') || m.includes('square')) return {
        meaning: 'A payment step failed.',
        todo: 'Look in the Square dashboard for that time. If someone was charged and has no access, the festival help button or the admin can restore it.',
    };
    if (m.includes('resend') || s.includes('email') || m.includes('rate limit')) return {
        meaning: 'An email failed to send.',
        todo: 'Check resend.com → Logs. Usually a daily sending limit or a bad address.',
    };
    if (m.includes('database offline') || m.includes('firebase') || m.includes('firestore') || m.includes('deadline exceeded')) return {
        meaning: 'The site could not reach the database.',
        todo: 'Check status.firebase.google.com. It usually recovers on its own within minutes.',
    };
    if (m.includes('s3') || m.includes('access denied') || m.includes('nosuchkey') || m.includes('signature')) return {
        meaning: 'A video or image file could not be reached in storage.',
        todo: 'Open the film on the site. If it will not play, re-upload the video in the admin.',
    };
    return {
        meaning: 'An error the robot does not recognise yet.',
        todo: 'Open admin → Error Log and search for the source shown here.',
    };
}

export interface ErrorGroup {
    source: string;
    message: string;
    count: number;
    viewerSide: boolean;
}

/** Collapses identical errors so the report says "12× Failed to fetch"
 *  instead of listing 12 lines. Biggest groups first. */
export function groupErrors(errors: ErrorFacts[]): ErrorGroup[] {
    const map = new Map<string, ErrorGroup>();
    for (const e of errors) {
        const msg = (e.message || 'Unknown error').replace(/\s+/g, ' ').slice(0, 140);
        const k = `${e.source}|${msg}`;
        const g = map.get(k);
        if (g) g.count++;
        else map.set(k, { source: e.source || 'unknown', message: msg, count: 1, viewerSide: isViewerSide(e) });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Turns the last window's errors into report items (nothing if it's quiet). */
export function errorItems(errors: ErrorFacts[], lookbackMinutes: number): ReportItem[] {
    const items: ReportItem[] = [];
    const permission = errors.filter(isPermissionError);
    const viewer = errors.filter(e => !isPermissionError(e) && isViewerSide(e));
    const site = errors.filter(e => !isPermissionError(e) && !isViewerSide(e));

    const describe = (list: ErrorFacts[]) => groupErrors(list).slice(0, 5).map(g => {
        const ex = explainError({ source: g.source, origin: g.viewerSide ? 'client' : 'server', message: g.message });
        return `${g.count}× ${g.source}: "${g.message}". ${ex.meaning}`;
    }).join('\n');

    if (permission.length > 0) {
        const ex = explainError(permission[0]);
        items.push({
            key: 'errors:permission',
            severity: 'critical',
            summary: `${permission.length} "permission denied" error${permission.length === 1 ? '' : 's'} in the last ${lookbackMinutes} minutes`,
            detail: describe(permission),
            todo: ex.todo,
        });
    }
    if (site.length >= SITE_ERROR_ALERT_COUNT) {
        const top = groupErrors(site)[0];
        items.push({
            key: `errors:site:${top.source}`,
            severity: 'warning',
            summary: `${site.length} site errors in the last ${lookbackMinutes} minutes (more than usual)`,
            detail: describe(site),
            todo: explainError({ source: top.source, origin: 'server', message: top.message }).todo,
        });
    }
    if (viewer.length >= VIEWER_ERROR_ALERT_COUNT) {
        items.push({
            key: 'errors:viewer',
            severity: 'warning',
            summary: `${viewer.length} viewers had connection problems in the last ${lookbackMinutes} minutes`,
            detail: describe(viewer),
            todo: 'A few of these are normal. This many at once can mean Vercel or Firebase is having trouble: check vercel-status.com and status.firebase.google.com.',
        });
    }
    return items;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Don't send the same email every 15 minutes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fixed items are always reported (each fix happens once). An unfixed
 * problem is reported the first time, then again only every
 * REPEAT_ALERT_AFTER_MS while it lasts.
 */
export function shouldSend(item: ReportItem, lastSentMs: number | undefined, nowMs: number): boolean {
    if (item.severity === 'fixed') return true;
    if (lastSentMs == null) return true;
    return nowMs - lastSentMs >= REPEAT_ALERT_AFTER_MS;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. The report email
// ─────────────────────────────────────────────────────────────────────────

const esc = (s: string) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COLOR: Record<Severity, string> = { fixed: '#22c55e', critical: '#ef4444', warning: '#f59e0b', info: '#9ca3af' };
const LABEL: Record<Severity, string> = { fixed: 'Fixed automatically', critical: 'Needs you now', warning: 'Worth a look', info: 'For your information' };

export function reportSubject(items: ReportItem[]): string {
    const fixed = items.filter(i => i.severity === 'fixed').length;
    const open = items.length - fixed;
    const critical = items.some(i => i.severity === 'critical');
    if (items.length === 0) return '✅ Crate TV health check: all clear';
    if (open === 0) return `✅ Crate TV: ${fixed} problem${fixed === 1 ? '' : 's'} found and fixed automatically`;
    const parts = [`${open} need${open === 1 ? 's' : ''} a look`];
    if (fixed) parts.push(`${fixed} fixed automatically`);
    return `${critical ? '🚨' : '⚠️'} Crate TV: ${parts.join(', ')}`;
}

export function reportHtml(items: ReportItem[], checkedAtText: string): string {
    if (items.length === 0) {
        return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;">All clear</h1>
            <p style="margin:0;color:#555;font-size:14px;">The health check ran and found nothing wrong.</p>
            <p style="margin:24px 0 0;font-size:11px;color:#666;">Checked ${esc(checkedAtText)} ET</p>`;
    }
    const order: Severity[] = ['critical', 'warning', 'fixed', 'info'];
    const sorted = [...items].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    return `
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;">Health check report</h1>
        ${sorted.map(i => `
            <div style="margin:0 0 18px;padding:16px;border-left:3px solid ${COLOR[i.severity]};background:rgba(0,0,0,0.03);">
                <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:${COLOR[i.severity]};">${LABEL[i.severity]}</p>
                <p style="margin:0 0 6px;font-weight:900;font-size:15px;">${esc(i.summary)}</p>
                <p style="margin:0;font-size:13px;color:#555;white-space:pre-line;">${esc(i.detail)}</p>
                ${i.todo ? `<p style="margin:10px 0 0;font-size:13px;color:#111;"><strong>What to do:</strong> ${esc(i.todo)}</p>` : ''}
            </div>`).join('')}
        <p style="margin:24px 0 0;font-size:11px;color:#666;">Checked ${esc(checkedAtText)} ET. The robot only fixes stuck watch parties and unrecorded ticket sales; everything else is left for you.</p>`;
}
