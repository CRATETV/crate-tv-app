// Seasons (Cratemas, Valentine's, Halloween, Black History Month…): a name, a look, a yearly
// date window and a short list of films. The homepage shows whichever one is active today.
// Pure + tested: tests/seasons.test.ts. Dates are "MM-DD" and repeat every year, in Eastern time.

export type SeasonTheme = 'christmas' | 'valentines' | 'halloween' | 'blackhistory' | 'gold' | 'generic';
export type SeasonMode = 'auto' | 'on' | 'off';

export interface Season {
    id: string;
    name: string;
    tagline?: string;
    theme: SeasonTheme;
    /** "MM-DD" first and last day it shows each year. */
    start: string;
    end: string;
    /** auto = follow the dates, on = show now regardless, off = hide. */
    mode: SeasonMode;
    movieKeys: string[];
}

export const THEME_LABELS: Record<SeasonTheme, string> = {
    christmas: 'Christmas', valentines: "Valentine's", halloween: 'Halloween',
    blackhistory: 'Black History Month', gold: 'Gold', generic: 'Neutral',
};

/** Suggested dates when a season is created. */
export const THEME_DEFAULTS: Record<SeasonTheme, { name: string; tagline: string; start: string; end: string }> = {
    christmas:    { name: 'Cratemas', tagline: 'Holiday stories, independent spirit, and cinematic cheer.', start: '12-01', end: '12-31' },
    valentines:   { name: "Valentine's", tagline: 'Love stories from independent voices.', start: '02-01', end: '02-14' },
    halloween:    { name: 'Spooky Season', tagline: 'Shorts that go bump in the night.', start: '10-15', end: '10-31' },
    blackhistory: { name: 'Black History Month', tagline: 'Celebrating Black storytellers all month long.', start: '02-01', end: '02-28' },
    gold:         { name: 'Anniversary', tagline: 'A celebration of the films that made Crate.', start: '01-01', end: '01-31' },
    generic:      { name: 'Featured Collection', tagline: 'A special selection, for a limited time.', start: '01-01', end: '12-31' },
};

const MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const isMonthDay = (s: unknown): s is string => typeof s === 'string' && MD.test(s);

/** Today's "MM-DD" on the Eastern clock. */
export function easternMonthDay(now: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const g = (t: string) => parts.find(p => p.type === t)!.value;
    return `${g('month')}-${g('day')}`;
}

/** Inside the window? Windows may wrap the new year (12-20 → 01-05). Inclusive on both ends. */
export function inWindow(md: string, start: string, end: string): boolean {
    if (!isMonthDay(start) || !isMonthDay(end)) return false;
    return start <= end ? md >= start && md <= end : md >= start || md <= end;
}

/** Whole days left including today, counting to the last day of the window (0 = not in it). */
export function daysLeft(now: Date, start: string, end: string): number {
    const md = easternMonthDay(now);
    if (!inWindow(md, start, end)) return 0;
    const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' }).format(now));
    const toDay = (m: string, y: number) => Date.UTC(y, Number(m.slice(0, 2)) - 1, Number(m.slice(3)));
    const endYear = start <= end || md <= end ? year : year + 1;
    return Math.round((toDay(end, endYear) - toDay(md, year)) / 86400000) + 1;
}

/** Cleans whatever is stored so the page never trips on a half-filled season. */
export function normalizeSeasons(raw: unknown): Season[] {
    if (!Array.isArray(raw)) return [];
    const out: Season[] = [];
    for (const r of raw as any[]) {
        if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) continue;
        const theme: SeasonTheme = r.theme in THEME_LABELS ? r.theme : 'generic';
        const d = THEME_DEFAULTS[theme];
        out.push({
            id: r.id, name: String(r.name || d.name).slice(0, 60), tagline: r.tagline ? String(r.tagline).slice(0, 200) : d.tagline, theme,
            start: isMonthDay(r.start) ? r.start : d.start, end: isMonthDay(r.end) ? r.end : d.end,
            mode: r.mode === 'on' || r.mode === 'off' ? r.mode : 'auto',
            movieKeys: Array.isArray(r.movieKeys) ? r.movieKeys.filter((k: unknown) => typeof k === 'string') : [],
        });
    }
    return out;
}

/** The season to show now. "on" beats the calendar; the first match wins. */
export function activeSeason(seasons: Season[], now = new Date()): Season | null {
    const md = easternMonthDay(now);
    const list = normalizeSeasons(seasons);
    return list.find(s => s.mode === 'on') || list.find(s => s.mode === 'auto' && inWindow(md, s.start, s.end)) || null;
}

/** The old single "holiday mode" switch, expressed as a season so nothing already live disappears. */
export function legacySeason(s: { isHolidayModeActive?: boolean; holidayName?: string; holidayTagline?: string; holidayTheme?: string }, movieKeys: string[]): Season | null {
    if (!s.isHolidayModeActive) return null;
    const theme: SeasonTheme = (s.holidayTheme as SeasonTheme) in THEME_LABELS ? (s.holidayTheme as SeasonTheme) : 'christmas';
    return { id: 'cratemas', name: s.holidayName || 'Cratemas', tagline: s.holidayTagline || THEME_DEFAULTS[theme].tagline, theme, start: '01-01', end: '12-31', mode: 'on', movieKeys };
}

/** What the site should show: a dated season first, else the legacy switch, else nothing. */
export function currentSeason(settings: { seasons?: unknown; isHolidayModeActive?: boolean; holidayName?: string; holidayTagline?: string; holidayTheme?: string }, legacyKeys: string[], now = new Date()): Season | null {
    return activeSeason(normalizeSeasons(settings.seasons), now) || legacySeason(settings, legacyKeys);
}

export const newSeasonId = () => `season-${Date.now().toString(36)}`;

/** Films in the old single "cratemas" row (found by key or by title). */
export function legacyCratemasKeys(categories: Record<string, { title?: string; movieKeys?: string[] }> | undefined): string[] {
    const cats = categories || {};
    const c = cats.cratemas || Object.values(cats).find(x => (x?.title || '').toLowerCase() === 'cratemas');
    return Array.isArray(c?.movieKeys) ? c!.movieKeys! : [];
}
