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
 * Can this film's watch party be shown on the home page (Upcoming row, live
 * notice, Just Premiered)? Yes even if the film is hidden from the catalog:
 * premiere films are usually kept hidden until their premiere (Oct 26 2026).
 * Not partner/PWFF committee films (their festival page shows them), and not
 * once the "Hide automatically after" time has passed. To take a party off
 * the home page, switch its watch party off.
 */
export function isWatchPartyListable(movie: { isWatchPartyEnabled?: boolean; availableUntil?: string | null; partnerId?: string | null } | null | undefined, nowMs: number): boolean {
    if (!movie || !movie.isWatchPartyEnabled) return false;
    if ((movie as any).partnerId) return false;
    return !isPastAvailableUntil(movie, nowMs);
}

/**
 * Films for the "Just premiered" row: the watch party started in the last
 * 7 days, is over (ended, or long enough ago), and the film is still on CRATE.
 */
export function isJustPremiered(
    movie: { isWatchPartyEnabled?: boolean; watchPartyStartTime?: string | null; lastPremiereAt?: string | null; isUnlisted?: boolean; availableUntil?: string | null; durationInMinutes?: number } | null | undefined,
    partyStatus: string | undefined,
    nowMs: number,
): boolean {
    if (!movie) return false;
    // When a party ends, CRATE switches it off and keeps the time in
    // lastPremiereAt, so that counts too.
    const ended = !movie.isWatchPartyEnabled && !!movie.lastPremiereAt;
    if (!ended && !isWatchPartyListable(movie as any, nowMs)) return false;
    if (ended && ((movie as any).partnerId || isPastAvailableUntil(movie, nowMs))) return false;
    if (ended) partyStatus = 'ended';
    const start = toMs(ended ? movie.lastPremiereAt : movie.watchPartyStartTime);
    if (start == null || start > nowMs || nowMs - start > JUST_PREMIERED_WINDOW_MS) return false;
    if (partyStatus === 'live') return false;
    if (partyStatus === 'ended') return true;
    const length = typeof movie.durationInMinutes === 'number' && movie.durationInMinutes > 0
        ? movie.durationInMinutes * 60_000 + 30 * 60_000
        : DEFAULT_PREMIERE_LENGTH_MS;
    return nowMs - start > length;
}


/**
 * Is this film being held back from viewers RIGHT NOW? One rule for every place
 * that can hand out the video (film page, Roku, public feeds), so a premiere can
 * never leak through a side door (Oct 30 2026).
 *   'not-released'  its release date/time is still in the future.
 *   'party-waiting' it has a watch party that hasn't started (15 seconds early is
 *                   fine, so the picture is ready at 0:00).
 *   'gone'          its "hide automatically after" time has passed.
 * `publicFeed` is for feeds anyone can read with no ticket: there, a watch party
 * film with NO start time is held too, since nothing says it has begun.
 */
export type HoldReason = 'not-released' | 'party-waiting' | 'gone' | null;
export function filmHoldReason(
    movie: { releaseDateTime?: string | null; availableUntil?: string | null; isWatchPartyEnabled?: boolean; watchPartyStartTime?: string | null } | null | undefined,
    nowMs: number,
    opts: { publicFeed?: boolean } = {},
): HoldReason {
    if (!movie) return null;
    if (isPastAvailableUntil(movie, nowMs)) return 'gone';
    const release = toMs(movie.releaseDateTime);
    if (release != null && release > nowMs) return 'not-released';
    if (movie.isWatchPartyEnabled === true) {
        const start = toMs(movie.watchPartyStartTime);
        if (start == null) return opts.publicFeed ? 'party-waiting' : null;
        if (start - 15_000 > nowMs) return 'party-waiting';
    }
    return null;
}
