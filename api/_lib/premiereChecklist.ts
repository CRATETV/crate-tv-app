// api/_lib/premiereChecklist.ts
//
// "Is this film ready for its premiere?" (Oct 29 2026)
//
// Built for "You Don't Know My Name" (premiere Nov 13, 2026, 7:30 PM Eastern,
// on sale for the weekend, then off CRATE). Reads the film's own fields and
// lists what is set, what is missing, and where to fix it, in plain words.
//
// Pure (no database) so it's tested: tests/premiereChecklist.test.ts.

import { isPastAvailableUntil } from './filmAvailability';
import { whenText } from './filmStatus';

export type CheckState = 'ok' | 'todo' | 'info';
export interface CheckItem { id: string; state: CheckState; label: string; detail: string }
export interface PremiereReadiness {
    items: CheckItem[];
    /** Number of must-have items done, and how many there are. */
    done: number;
    total: number;
    ready: boolean;
    /** ms until the premiere starts (negative once started); null if no time is set. */
    msUntil: number | null;
}

interface MovieLike {
    fullMovie?: string; poster?: string; tvPoster?: string; trailer?: string; synopsis?: string; director?: string;
    durationInMinutes?: number;
    isWatchPartyEnabled?: boolean; watchPartyStartTime?: string; isWatchPartyPaid?: boolean; watchPartyPrice?: number; watchPartyPayWhatYouWant?: boolean;
    isForSale?: boolean; salePrice?: number;
    availableUntil?: string | null; isUnlisted?: boolean; partnerId?: string | null;
}

const toMs = (v: unknown): number | null => {
    if (typeof v !== 'string' || !v) return null;
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
};
const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function premiereReadiness(movie: MovieLike, nowMs: number): PremiereReadiness {
    const items: CheckItem[] = [];
    const must = (id: string, ok: boolean, label: string, okDetail: string, fix: string) =>
        items.push({ id, state: ok ? 'ok' : 'todo', label, detail: ok ? okDetail : fix });
    const info = (id: string, label: string, detail: string) => items.push({ id, state: 'info', label, detail });

    const start = toMs(movie.watchPartyStartTime);
    const party = !!movie.isWatchPartyEnabled && start != null;
    must('party', party && start! > nowMs - 6 * 3600_000, 'Premiere is scheduled',
        party ? `Starts ${whenText(start!)} (New York time).` : '',
        !movie.isWatchPartyEnabled
            ? 'Watch party is switched off. Turn it on and set the date and time under Watch parties (or in the film).'
            : start == null ? 'No start time yet. Set it under Watch parties.' : `The start time (${whenText(start)}) has already passed. Set the new time under Watch parties.`);

    const video = (movie.fullMovie || '').trim();
    const streaming = /\.m3u8(\?|$)/i.test(video);
    must('video', !!video && streaming, 'Film is ready to stream',
        'The converted streaming version is attached.',
        !video ? 'No film file yet. Use "Upload & convert film" in the film editor.'
            : 'The film file is not the converted streaming version (.m3u8). Phones and slow connections can struggle with it. Use "Upload & convert film" in the film editor.');

    must('poster', !!movie.poster, 'Poster', 'Poster is set.', 'Add the poster in the film editor.');
    must('tvposter', !!movie.tvPoster, 'Roku poster', 'Roku poster is set.', 'Add the wide TV poster in the film editor so it looks right on Roku.');
    must('runtime', (movie.durationInMinutes || 0) > 0, 'Runtime', `${movie.durationInMinutes} minutes.`, 'Runtime is empty. It fills in when the film is converted, or type it in the film editor. The party and "Just premiered" use it to know when the film is over.');
    must('words', !!(movie.synopsis || '').trim() && !!(movie.director || '').trim(), 'Synopsis and director', 'Both are filled in.', 'Add the synopsis and the director name in the film editor.');

    const paid = !!movie.isWatchPartyPaid;
    const price = movie.watchPartyPrice || 0;
    if (!paid) info('ticket', 'Premiere tickets', 'Free to join. (To charge, switch on "paid watch party" and set the price.)');
    else if (movie.watchPartyPayWhatYouWant) info('ticket', 'Premiere tickets', 'Viewers choose their price (minimum $3).');
    else must('ticket', price > 0, 'Premiere ticket price', `Tickets are ${usd(price)}.`, 'The party is marked paid but has no price. Set it under Watch parties.');

    const sale = toMs(movie.availableUntil);
    const forSale = !!movie.isForSale && (movie.salePrice || 0) > 0;
    must('weekend', forSale, 'On sale after the premiere', `Viewers can buy it for ${usd(movie.salePrice || 0)} after the premiere.`,
        'Not for sale yet. Switch on "for sale" and set the price in the film editor so people can buy it for the weekend.');

    must('takedown', sale != null && (start == null || sale > start), 'Comes off CRATE by itself',
        sale != null ? `Hides automatically ${whenText(sale)}.` : '',
        sale == null ? 'No "Hide automatically after" time. Set it to the end of the weekend (for example Sunday 11:59 PM) so it comes down without anyone remembering.'
            : 'The hide time is before the premiere starts. Set it to after the premiere weekend.');
    if (sale != null && isPastAvailableUntil(movie, nowMs)) items.find(i => i.id === 'takedown')!.detail = 'The hide time has already passed, so the film is off CRATE.';

    if (!movie.trailer) info('trailer', 'Trailer', 'No trailer. It is not required, but it helps people decide and shows on the film page.');
    if (movie.partnerId) info('partner', 'Partner film', 'This is a partner festival film. Its party runs from the partner festival page.');
    info('hidden', movie.isUnlisted ? 'Hidden until the premiere' : 'Visible in the catalog',
        movie.isUnlisted
            ? 'Unlisted is on, so the film is off the home page and library. Its party still shows under Upcoming watch parties, and under Just premiered for a week after.'
            : 'The film is visible in the catalog now. If you want it hidden until the night, switch Unlisted on.');

    const musts = items.filter(i => i.state !== 'info');
    const done = musts.filter(i => i.state === 'ok').length;
    return { items, done, total: musts.length, ready: done === musts.length, msUntil: start == null ? null : start - nowMs };
}

/** "15 days, 3 hours", "2 hours, 5 minutes", "started". */
export function countdownText(ms: number | null): string {
    if (ms == null) return '';
    if (ms <= 0) return 'started';
    const m = Math.floor(ms / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
    if (d >= 1) return `${plural(d, 'day')}, ${plural(h % 24, 'hour')}`;
    if (h >= 1) return `${plural(h, 'hour')}, ${plural(m % 60, 'minute')}`;
    return plural(Math.max(1, m), 'minute');
}
