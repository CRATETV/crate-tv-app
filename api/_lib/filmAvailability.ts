// api/_lib/filmAvailability.ts
//
// "Hide automatically after" (Oct 2026). Set a date on a film in the Movie
// Editor (`availableUntil`) and after that moment CRATE:
//   - hides it everywhere (home rows, library, search, Roku), and
//   - stops selling it (no new rentals or tickets).
// Built for premieres like "You Don't Know My Name": premiere Friday, on sale
// for the weekend, gone Monday, without anyone remembering to switch it off.
//
// Plus the "Just premiered" row: a film whose premiere ended in the last
// 7 days shows on the home page automatically, so people can still buy it.
//
// Pure (no database) so it's tested: tests/filmAvailability.test.ts.

export const JUST_PREMIERED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** If we don't know how long a film is, treat the premiere as over this long after it started. */
const DEFAULT_PREMIERE_LENGTH_MS = 3 * 60 * 60 * 1000;

const toMs = (v: unknown): number | null => {
    if (typeof v !== 'string' || !v) return null;
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
};

/** True once the film's "hide automatically after" time has passed. */
export function isPastAvailableUntil(movie: { availableUntil?: string | null } | null | undefined, nowMs: number): boolean {
    const until = toMs(movie?.availableUntil);
    return until != null && nowMs >= until;
}

/**
 * Films for the "Just premiered" row: the watch party started in the last
 * 7 days, is over (ended, or long enough ago), and the film is still on CRATE.
 */
export function isJustPremiered(
    movie: { isWatchPartyEnabled?: boolean; watchPartyStartTime?: string; isUnlisted?: boolean; availableUntil?: string | null; durationInMinutes?: number } | null | undefined,
    partyStatus: string | undefined,
    nowMs: number,
): boolean {
    if (!movie || !movie.isWatchPartyEnabled || movie.isUnlisted) return false;
    if (isPastAvailableUntil(movie, nowMs)) return false;
    const start = toMs(movie.watchPartyStartTime);
    if (start == null || start > nowMs || nowMs - start > JUST_PREMIERED_WINDOW_MS) return false;
    if (partyStatus === 'live') return false;
    if (partyStatus === 'ended') return true;
    const length = typeof movie.durationInMinutes === 'number' && movie.durationInMinutes > 0
        ? movie.durationInMinutes * 60_000 + 30 * 60_000
        : DEFAULT_PREMIERE_LENGTH_MS;
    return nowMs - start > length;
}
