// api/_lib/festivalPass.ts
//
// The full festival pass (PWFF all-access) is good for ONE festival: the
// festival weekend plus the rewatch week after it. After that it ends, and
// next year's festival needs a new pass. Covered by tests/festivalPass.test.ts.
//
// How it's stored on users/<uid>:
//   festivalPassExpiry   when this pass stops working (ISO date)  ← the only thing checked
//   hasFestivalAllAccess true (kept as a "bought a pass at some point" record)
//
// Before Oct 2026 a pass was only `hasFestivalAllAccess: true` with no end
// date, so it worked forever. Those old passes (all from the 2026 festival,
// which ended Aug 2026) now count as ended.
//
// Pure, no database: imported by the API and by the website.

const DAY = 24 * 60 * 60 * 1000;

/** Extra day after the rewatch week so a late-running last block is never cut short. */
export const PASS_GRACE_MS = DAY;

/** Used only if a pass is sold before any block has a screening time. Fixable from admin. */
export const PASS_FALLBACK_MS = 120 * DAY;

export interface PassHolder {
    festivalPassExpiry?: string | null;
    hasFestivalAllAccess?: boolean;
}

/** Is this person's full festival pass working right now? */
export function isFestivalPassActive(user: PassHolder | null | undefined, nowMs: number = Date.now()): boolean {
    const exp = Date.parse(String(user?.festivalPassExpiry || ''));
    return Number.isFinite(exp) && exp > nowMs;
}

interface TimedBlock { screeningStartTime?: string | null; watchPartyStartTime?: string | null; festivalEndTime?: string | null }

/**
 * When a pass bought now should stop working: the festival's last block,
 * plus the rewatch week, plus one grace day.
 */
export function festivalPassExpiryFor(blocks: TimedBlock[], rewatchWindowMs: number, nowMs: number = Date.now()): string {
    const times = blocks
        .map(b => Date.parse(String(b?.festivalEndTime || b?.screeningStartTime || b?.watchPartyStartTime || '')))
        .filter(Number.isFinite);
    if (!times.length) return new Date(nowMs + PASS_FALLBACK_MS).toISOString();
    const end = Math.max(...times) + rewatchWindowMs + PASS_GRACE_MS;
    // Never hand out a pass that is already over.
    return new Date(Math.max(end, nowMs + DAY)).toISOString();
}

/** Keep whichever end date is later (re-granting never shortens a pass). */
export function laterExpiry(a: string | null | undefined, b: string): string {
    const pa = Date.parse(String(a || ''));
    return Number.isFinite(pa) && pa > Date.parse(b) ? String(a) : b;
}

/**
 * Partner festivals (Festival in a box) can run again every year. A partner
 * pass only belongs to the current edition if it was bought after that
 * partner's previous edition was cleaned up.
 */
export function partnerPassIsCurrent(purchasedAtMs: number | null | undefined, lastCleanupMs: number | null | undefined): boolean {
    if (!lastCleanupMs) return true;
    return !!purchasedAtMs && purchasedAtMs > lastCleanupMs;
}
