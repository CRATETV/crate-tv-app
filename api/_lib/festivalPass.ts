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

const blockTimes = (blocks: TimedBlock[]) => blocks
    .map(b => Date.parse(String(b?.festivalEndTime || b?.screeningStartTime || b?.watchPartyStartTime || '')))
    .filter(Number.isFinite);

/**
 * When a pass bought now should stop working: the festival's last block,
 * plus the rewatch week, plus one grace day. Null when no block has a
 * screening time yet (passes aren't sold then, see festivalPassOnSale).
 */
export function festivalPassExpiryFor(blocks: TimedBlock[], rewatchWindowMs: number): string | null {
    const times = blockTimes(blocks);
    if (!times.length) return null;
    return new Date(Math.max(...times) + rewatchWindowMs + PASS_GRACE_MS).toISOString();
}

/**
 * A full pass can only be sold (or given by code/invite) while a festival
 * with real screening times is coming up or still in its rewatch week.
 * Otherwise there's nothing for the pass to be "for": no schedule yet, or
 * only last year's blocks left in the schedule.
 */
export function festivalPassOnSale(blocks: TimedBlock[], rewatchWindowMs: number, nowMs: number = Date.now()): { onSale: boolean; reason?: string } {
    const times = blockTimes(blocks);
    if (!times.length) return { onSale: false, reason: 'Festival passes go on sale once the schedule is set.' };
    if (Math.max(...times) + rewatchWindowMs <= nowMs) return { onSale: false, reason: "This year's festival has ended. Passes for the next festival go on sale once its schedule is set." };
    return { onSale: true };
}

/** A block ticket can't be sold once that screening and its rewatch week are over. */
export function blockSaleClosed(block: TimedBlock, rewatchWindowMs: number, nowMs: number = Date.now()): boolean {
    const t = blockTimes([block])[0];
    return t != null && t + rewatchWindowMs <= nowMs;
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
