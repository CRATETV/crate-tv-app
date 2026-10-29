// api/_lib/filmStatus.ts
//
// "Where is my film, and why can't people see it?" (Oct 29 2026)
//
// One plain-language status per film for the Films list and the Overview.
// A film can be hidden by several different things (the Unlisted switch, a
// future release date, a festival block that keeps it out of the catalog, a
// "hide automatically" date) and nothing in the admin said which one was at
// work. This reads the same fields the public site reads and says it.
//
// Pure (no database) so it's tested: tests/filmStatus.test.ts.

import { isPastAvailableUntil } from './filmAvailability';

export type Tone = 'green' | 'amber' | 'sky' | 'gray' | 'violet';

export interface FilmStatus {
    /** The one-line answer: "Live on CRATE", "Hidden until its festival screening ends"... */
    headline: string;
    tone: Tone;
    /** One or two sentences: why, and what to do about it. */
    detail: string;
    /** Small facts shown as chips: "Series · 6 episodes", "Premiere Nov 13"... */
    tags: { label: string; tone: Tone }[];
    /** Which filter chips this film belongs to. */
    groups: FilmGroup[];
    /** Names of the rows (categories) that include this film. */
    rows: string[];
}

export type FilmGroup = 'live' | 'hidden' | 'soon' | 'premiere' | 'festival' | 'norow' | 'series';

export const GROUP_LABELS: Record<FilmGroup, string> = {
    live: 'Live on CRATE',
    hidden: 'Hidden',
    soon: 'Coming soon',
    premiere: 'Premieres',
    festival: 'In a festival',
    norow: 'Not in any row',
    series: 'Series',
};

interface MovieLike {
    key?: string;
    isUnlisted?: boolean;
    releaseDateTime?: string;
    availableUntil?: string | null;
    isWatchPartyEnabled?: boolean;
    watchPartyStartTime?: string;
    lastPremiereAt?: string;
    isSeries?: boolean;
    episodes?: unknown[];
    partnerId?: string | null;
}
interface BlockLike { id?: string; title?: string; movieKeys?: string[]; releaseAfterScreening?: boolean; festivalEndTime?: string; partnerId?: string | null; screeningStartTime?: string }
interface DayLike { day?: number; blocks?: BlockLike[]; partnerId?: string | null }
interface CategoryLike { title?: string; movieKeys?: string[] }

const toMs = (v: unknown): number | null => {
    if (typeof v !== 'string' || !v) return null;
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
};

/** "Fri, Nov 13 at 7:00 PM" in New York time (CRATE's clock). */
export function whenText(ms: number): string {
    const d = new Date(ms);
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
    return `${date} at ${time}`;
}

export function filmStatus(
    key: string,
    movie: MovieLike,
    categories: Record<string, CategoryLike> | undefined,
    days: DayLike[] | undefined,
    nowMs: number,
): FilmStatus {
    const rows = Object.values(categories || {})
        .filter(c => Array.isArray(c?.movieKeys) && c.movieKeys!.includes(key))
        .map(c => c.title || 'Untitled row');

    const blocks: { title: string; releaseAfter: boolean; ended: boolean; partner: boolean }[] = [];
    for (const d of days || []) {
        for (const b of d?.blocks || []) {
            if (Array.isArray(b?.movieKeys) && b.movieKeys.includes(key)) {
                blocks.push({ title: b.title || 'a festival block', releaseAfter: !!b.releaseAfterScreening, ended: !!b.festivalEndTime, partner: !!(b.partnerId || d.partnerId) });
            }
        }
    }
    const openBlock = blocks.find(b => !b.ended) || null;

    const releaseMs = toMs(movie.releaseDateTime);
    const comingSoon = releaseMs != null && releaseMs > nowMs;
    const partyMs = toMs(movie.watchPartyStartTime);
    const premiereOn = !!movie.isWatchPartyEnabled && partyMs != null;
    const premiereUpcoming = premiereOn && partyMs! > nowMs - 24 * 3600_000;
    const tookDown = isPastAvailableUntil(movie, nowMs);
    const hideMs = toMs(movie.availableUntil);

    const tags: FilmStatus['tags'] = [];
    const groups: FilmGroup[] = [];
    if (movie.isSeries) {
        const n = Array.isArray(movie.episodes) ? movie.episodes.length : 0;
        tags.push({ label: `Series · ${n} episode${n === 1 ? '' : 's'}`, tone: 'violet' });
        groups.push('series');
    }
    if (premiereOn) {
        tags.push({ label: `Premiere ${whenText(partyMs!)}`, tone: 'sky' });
        if (premiereUpcoming) groups.push('premiere');
    }
    for (const b of blocks) {
        tags.push({ label: `${b.partner ? 'Partner festival' : 'Festival'}: ${b.title}`, tone: 'violet' });
    }
    if (blocks.length) groups.push('festival');
    if (hideMs != null && !tookDown) tags.push({ label: `Hides itself ${whenText(hideMs)}`, tone: 'gray' });

    let headline: string;
    let tone: Tone;
    let detail: string;
    let live = false;

    if (tookDown) {
        headline = 'Taken down automatically';
        tone = 'gray';
        detail = `Its “hide automatically after” time (${whenText(hideMs!)}) has passed. Clear that date in the film to bring it back.`;
        groups.push('hidden');
    } else if (movie.isUnlisted) {
        groups.push('hidden');
        if (openBlock && !openBlock.partner) {
            if (openBlock.releaseAfter) {
                headline = 'Hidden until its festival screening ends';
                tone = 'amber';
                detail = `It's in “${openBlock.title}”. When that screening ends, it goes into the catalog by itself.`;
            } else {
                headline = 'Festival only: not going to the catalog';
                tone = 'amber';
                detail = `It's in “${openBlock.title}”, and that block is set to keep films out of the catalog. To put it in the catalog after the screening, tick “Release films to the regular catalog…” on that block (PWFF festival tab), or switch Unlisted off on the film.`;
            }
        } else if (openBlock) {
            headline = 'Shown on its partner festival page only';
            tone = 'amber';
            detail = `It's in “${openBlock.title}”, a partner festival. Partner films aren't added to the CRATE catalog.`;
        } else if (premiereUpcoming) {
            headline = 'Hidden until its premiere';
            tone = 'amber';
            detail = `Premiere ${whenText(partyMs!)}. It shows under Upcoming premieres, and under Just premiered for a week afterwards. After that it leaves unless you switch Unlisted off.`;
        } else {
            headline = 'Hidden: Unlisted is switched on';
            tone = 'amber';
            detail = 'Unlisted keeps it off the home page, library and search. Switch it off in the film to show it.';
        }
    } else if (comingSoon) {
        headline = 'Coming soon';
        tone = 'sky';
        detail = `Its release date is ${whenText(releaseMs!)}. Until then it shows as coming soon, not as watchable.`;
        groups.push('soon');
    } else {
        live = true;
        groups.push('live');
        if (rows.length) {
            headline = 'Live on CRATE';
            tone = 'green';
            detail = `Showing in: ${rows.join(', ')}.`;
        } else {
            headline = 'Live, but not in any row';
            tone = 'amber';
            detail = 'People can find it in the Library and search, but it is not on the home page. Add it to a row under Rows & categories.';
            groups.push('norow');
        }
    }

    if (!live && rows.length === 0 && !movie.isUnlisted) groups.push('norow');
    return { headline, tone, detail, tags, groups, rows };
}

/** How many films fall in each filter chip. */
export function groupCounts(statuses: FilmStatus[]): Record<FilmGroup, number> {
    const out: Record<FilmGroup, number> = { live: 0, hidden: 0, soon: 0, premiere: 0, festival: 0, norow: 0, series: 0 };
    for (const s of statuses) for (const g of new Set(s.groups)) out[g]++;
    return out;
}
