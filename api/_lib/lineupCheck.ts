// api/_lib/lineupCheck.ts
//
// "Will every film in the festival lineup actually play?" — checked from the
// schedule itself, any time, not just on the night.
//
// Festival night 2026 went wrong after films were deleted and added again:
// the schedule still pointed at the OLD film, so a block came up empty or
// stale. This reads every upcoming block and lists, in plain words, each film
// that is missing from the catalog or has no streaming-ready video.

export interface LineupProblem {
    kind: 'missing' | 'no-video' | 'unconverted';
    block: string;
    filmKey: string;
    film: string;
    text: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ms = (v: unknown): number | null => {
    if (typeof v !== 'string' || !v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
};

/** Blocks still to come (or on right now). Finished blocks are skipped. */
function upcomingBlocks(festivalData: any[], nowMs: number): any[] {
    return (festivalData || [])
        .flatMap(d => (Array.isArray(d?.blocks) ? d.blocks : []))
        .filter(b => {
            if (!b || typeof b !== 'object') return false;
            if (ms(b.festivalEndTime) != null) return false; // its watch party already ended
            const start = ms(b.watchPartyStartTime) ?? ms(b.screeningStartTime);
            return start == null || start > nowMs - DAY_MS;
        });
}

export function lineupProblems(festivalData: any[], movies: Record<string, any>, nowMs: number): LineupProblem[] {
    const out: LineupProblem[] = [];
    for (const b of upcomingBlocks(festivalData, nowMs)) {
        const block = String(b.title || 'Untitled block');
        for (const key of Array.isArray(b.movieKeys) ? b.movieKeys : []) {
            const film = movies?.[key];
            if (!film) {
                out.push({ kind: 'missing', block, filmKey: key, film: key, text: `"${block}" lists a film that is no longer in the catalog. If you deleted and re-added it, pick it again in the schedule.` });
                continue;
            }
            const title = String(film.title || key);
            const video = String(film.fullMovie || '').trim();
            if (!video) out.push({ kind: 'no-video', block, filmKey: key, film: title, text: `"${title}" (in "${block}") has no video file.` });
            else if (!/\.m3u8(\?|$)/i.test(video)) out.push({ kind: 'unconverted', block, filmKey: key, film: title, text: `"${title}" (in "${block}") is not the converted streaming version yet.` });
        }
    }
    return out;
}
