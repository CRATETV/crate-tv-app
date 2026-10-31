// api/_lib/topTen.ts — ONE rule for "Top Ten Today" (Oct 30 2026).
// Used by the website home page, the landing page, the Top Ten page and the
// Roku feed, so every screen shows the same list in the same order.
//
// Before, each screen filtered a little differently, and when films tied on
// views (many have 0) each screen put them in whatever order its data came in,
// so the lists disagreed. Now: most views first; ties go to the film that
// premiered most recently, then by title, then by key, so the order never
// changes from one screen to the next.
import { isPastAvailableUntil } from './filmAvailability.js';

export interface RankableFilm {
    key: string;
    title?: string;
    poster?: string;
    isUnlisted?: boolean;
    releaseDateTime?: string;
    availableUntil?: string | null;
    publishedAt?: string;
}

const ms = (v?: string | null) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : 0; };

/** Can this film be on the Top Ten at all? (listed, has a poster, released, not past its end date) */
export function isTopTenEligible(m: RankableFilm | null | undefined, nowMs: number): boolean {
    if (!m || !m.key || !m.poster || m.isUnlisted) return false;
    if (m.releaseDateTime && Date.parse(m.releaseDateTime) > nowMs) return false;
    return !isPastAvailableUntil(m, nowMs);
}

/** Every eligible film, best first. Same answer on every screen. */
export function rankByViews<T extends RankableFilm>(movies: Iterable<T | undefined | null>, viewCounts: Record<string, number> | undefined, nowMs: number): T[] {
    const list = [...movies].filter((m): m is T => isTopTenEligible(m, nowMs));
    return list.sort((a, b) =>
        ((viewCounts?.[b.key] || 0) - (viewCounts?.[a.key] || 0))
        || (ms(b.publishedAt) - ms(a.publishedAt))
        || String(a.title || '').localeCompare(String(b.title || ''))
        || a.key.localeCompare(b.key));
}

export const topTen = <T extends RankableFilm>(movies: Iterable<T | undefined | null>, viewCounts: Record<string, number> | undefined, nowMs: number, limit = 10): T[] =>
    rankByViews(movies, viewCounts, nowMs).slice(0, limit);
