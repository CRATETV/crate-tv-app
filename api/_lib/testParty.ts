// api/_lib/testParty.ts
//
// Test watch parties clean up after themselves (Oct 2026).
// A film can be marked "This is a test party" in the film editor. Once that party
// has ended (or its time passed long ago without it ever running), the film is
// switched back to normal: watch party off, paid ticket off. Without this, a test
// leaves the film locked and in the Premier Access row on the Roku and website.
// Real paid premieres (not marked as a test) are never touched.

const ABANDONED_AFTER_MS = 6 * 60 * 60 * 1000;

const toMs = (v: any): number | null => {
    if (v == null) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v === 'object' && typeof v._seconds === 'number') return v._seconds * 1000;
    const t = typeof v === 'number' ? v : Date.parse(v);
    return Number.isFinite(t) ? t : null;
};

export function testPartyResetDue(movie: any, partyState: any, nowMs: number): boolean {
    if (!movie || movie.isTestParty !== true) return false;
    if (partyState?.status === 'live') return false;
    const startMs = toMs(movie.watchPartyStartTime);
    const endedMs = toMs(partyState?.endedAt);
    // It ran and finished.
    if (partyState?.status === 'ended' && endedMs != null && (startMs == null || endedMs >= startMs)) return true;
    // It never ran (or nobody finished it) and the time is long gone.
    if (startMs != null && nowMs - startMs > ABANDONED_AFTER_MS) return true;
    return false;
}

/** What the film record becomes. Nothing else on the film is touched. */
export const TEST_PARTY_RESET = {
    isWatchPartyEnabled: false,
    isWatchPartyPaid: false,
    watchPartyStartTime: '',
    isTestParty: false,
} as const;
