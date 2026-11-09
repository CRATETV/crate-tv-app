// Which films the Roku lists under "Watch Parties". Same rule as the website's upcoming-party banner:
// a party that already ran and ended for its scheduled time is NOT upcoming, even if its film still has
// "watch party" switched on. (Before Nov 2026 the Roku ignored the ended state, so a finished test party
// kept showing as "upcoming" on the TV.) Pure + tested: tests/rokuParties.test.ts.
import { isEndedForThisRun } from './watchPartyRules.js';

const PAST_GRACE_MS = 6 * 3600_000;
const FUTURE_MS = 30 * 86_400_000;

export function showAsRokuParty(movie: { isWatchPartyEnabled?: boolean; watchPartyStartTime?: string | null } | null | undefined, partyState: any, isLive: boolean, nowMs: number): boolean {
    if (!movie || movie.isWatchPartyEnabled !== true || !movie.watchPartyStartTime) return false;
    if (isLive) return true;
    const start = Date.parse(movie.watchPartyStartTime);
    if (!Number.isFinite(start)) return false;
    if (isEndedForThisRun(partyState, start)) return false;
    return start > nowMs - PAST_GRACE_MS && start < nowMs + FUTURE_MS;
}
