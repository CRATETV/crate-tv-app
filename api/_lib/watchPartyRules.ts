// api/_lib/watchPartyRules.ts
//
// The pure, database-free rules behind the watch-party lifecycle (timing,
// restart protection, intermissions, ticket expiry). Kept separate so they
// can be unit-tested without Firebase — see tests/watchPartyRules.test.ts.
// The database side lives in watchPartyLifecycle.ts.

/** Viewers' devices can report "film ended" up to ~1 min before the
 *  whole-minute recorded runtime has elapsed on the server clock. */
export const ADVANCE_EARLY_TOLERANCE_MS = 60 * 1000;

/** How long after a film's recorded runtime the SERVER advances on its own
 *  if no viewer has already done so. Covers runtimes rounded down by up to
 *  a minute plus a little buffering, without leaving a room of viewers
 *  staring at a frozen frame for long. */
export const SERVER_ADVANCE_GRACE_MS = 90 * 1000;

/** "A few minutes" after the last film before the party is closed. */
export const AUTO_END_GRACE_MS = 3 * 60 * 1000;

/** Used when a film has no runtime recorded. Generous on purpose so the
 *  server never cuts a film off — admins can always force an advance. */
export const UNKNOWN_RUNTIME_MS = 3 * 60 * 60 * 1000;

const NORMAL_INTERMISSION_SECONDS = 30;
const STRETCH_BREAK_SECONDS = 90;
const STRETCH_BREAK_THRESHOLD_FILMS = 5;

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers (no database) — covered by tests/watchPartyRules.test.ts
// ─────────────────────────────────────────────────────────────────────────

/** Accepts a Firestore Timestamp, a Date, an ISO string or epoch ms. */
export function toMillis(value: any): number | null {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') {
        const t = Date.parse(value);
        return Number.isNaN(t) ? null : t;
    }
    return null;
}

/**
 * Should the scheduler start this party now?
 *
 * Yes only when the scheduled start has arrived AND this particular
 * scheduled run hasn't already happened. A party counts as "already run"
 * if it is live, or if it ended at/after the scheduled start time (or the
 * block carries a festivalEndTime at/after it). Rescheduling a party to a
 * NEW time after it ended still works: the new start is later than the old
 * end, so it qualifies again.
 */
export function shouldAutoStart(params: {
    scheduledStartMs: number | null;
    nowMs: number;
    partyState?: any;
    blockFestivalEndTime?: string | null;
}): boolean {
    const { scheduledStartMs, nowMs, partyState, blockFestivalEndTime } = params;
    if (scheduledStartMs == null || scheduledStartMs > nowMs) return false;
    if (partyState?.status === 'live') return false;

    const blockEndedMs = toMillis(blockFestivalEndTime);
    if (blockEndedMs != null && blockEndedMs >= scheduledStartMs) return false;

    if (partyState?.status === 'ended') {
        const endedMs = toMillis(partyState.endedAt) ?? toMillis(partyState.lastUpdated);
        // Ended with no timestamp at all → treat as already run (fail safe:
        // never resurrect a party we can't prove belongs to an older run).
        if (endedMs == null || endedMs >= scheduledStartMs) return false;
    }
    return true;
}

/** Recorded runtime in ms, or UNKNOWN_RUNTIME_MS when missing/invalid. */
export function runtimeMs(durationInMinutes: unknown): number {
    return typeof durationInMinutes === 'number' && durationInMinutes > 0
        ? durationInMinutes * 60 * 1000
        : UNKNOWN_RUNTIME_MS;
}

/** Intermission length before film `nextIndex` (0-based) of a block. */
export function intermissionSecondsFor(nextIndex: number, totalFilms: number): { seconds: number; isStretchBreak: boolean } {
    const isStretchBreak = totalFilms >= STRETCH_BREAK_THRESHOLD_FILMS && nextIndex === Math.floor(totalFilms / 2);
    return { seconds: isStretchBreak ? STRETCH_BREAK_SECONDS : NORMAL_INTERMISSION_SECONDS, isStretchBreak };
}

/**
 * Has the party ended for THIS scheduled run? A party keeps status 'ended'
 * from its previous run (or a test) until the next run starts; if it's been
 * rescheduled for later than it ended, that's a new run that hasn't started.
 */
export function isEndedForThisRun(partyState: any, scheduledStartMs: number | null): boolean {
    if (partyState?.status !== 'ended') return false;
    if (scheduledStartMs == null) return true;
    const endedMs = toMillis(partyState.endedAt) ?? toMillis(partyState.lastUpdated);
    return endedMs == null || endedMs >= scheduledStartMs;
}

/**
 * Festival block access window: tickets stay valid through the block's
 * screening plus the rewatch week (+1 day). Only a block with no start time
 * yet falls back to `minDays` from purchase.
 *
 * (Before Oct 2026 the 14-day minimum applied to every ticket, so one bought
 * on the last rewatch day kept the films two more weeks after the festival.)
 */
export function blockAccessExpiry(params: {
    nowMs: number;
    screeningStartTime?: string | null;
    rewatchWindowMs: number;
    minDays?: number;
}): Date {
    const { nowMs, screeningStartTime, rewatchWindowMs, minDays = 14 } = params;
    const floor = nowMs + minDays * 24 * 60 * 60 * 1000;
    const start = toMillis(screeningStartTime);
    if (start == null) return new Date(floor);
    return new Date(start + rewatchWindowMs + 24 * 60 * 60 * 1000);
}


/**
 * Saving a watch party with a NEW future start time: a leftover "ended"
 * (from a test run or the last screening) is put back to "waiting", so the
 * home page, the lobby and Roku all show the new party straight away instead
 * of treating it as over until someone presses Restart (Oct 26 2026).
 * A party that is live right now is never touched.
 */
export function resetForNewSchedule(partyState: any, newStartMs: number | null, nowMs: number): boolean {
    if (newStartMs == null || !Number.isFinite(newStartMs) || newStartMs <= nowMs) return false;
    return partyState?.status === 'ended';
}
