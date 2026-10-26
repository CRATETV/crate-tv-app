// api/_lib/filmFileMatch.ts — Bulk upload (Oct 2026): guess which film a
// dropped video file belongs to, from its file name. Only a suggestion: the
// admin panel shows the guess and Salome can change it before uploading.
// Tested in tests/filmFileMatch.test.ts.

export interface FilmChoice { key: string; title: string; director?: string }

// Words editors add to export names that say nothing about the film.
const NOISE = new Set([
    'final', 'finale', 'master', 'export', 'exported', 'cut', 'copy', 'version', 'ver', 'v', 'mix', 'edit', 'web', 'render',
    'prores', 'h264', 'h265', 'hevc', 'x264', 'x265', 'hd', 'uhd', 'sdr', 'hdr', '4k', '2k', '1080p', '720p', '2160p', '1080', '720',
    'mov', 'mp4', 'm4v', 'mxf', 'mkv', 'avi', 'film', 'short', 'movie', 'stereo', 'lpcm', 'aac', 'locked', 'picture', 'fixed', 'new',
]);

/** "You Don't Know My Name (FINAL v2).MOV" → "you dont know my name" */
export function normTitle(s: string): string {
    return String(s || '')
        .replace(/\.[A-Za-z0-9]{2,4}$/, '')           // file extension
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/['’`]/g, '')                        // don't → dont
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w && !NOISE.has(w) && !/^v\d+$/.test(w) && !/^(19|20)\d\d$/.test(w) && !/^\d{6,}$/.test(w))
        .join(' ');
}

const words = (s: string) => (s ? s.split(' ') : []);

/** How sure we are that this file is this film (0 = not at all). */
export function matchScore(fileName: string, film: FilmChoice): number {
    // "The Mirror Dance" and "Mirror Dance" are the same film.
    const noArticle = (x: string) => x.replace(/^(the|a|an) /, '');
    const f = noArticle(normTitle(fileName));
    const t = noArticle(normTitle(film.title));
    if (!f || !t) return 0;
    const tw = words(t);
    if (f === t) return 100;
    // Title as whole words inside the file name ("TINO Michael James Mina" holds "tino").
    if (` ${f} `.includes(` ${t} `)) {
        let s = 80 + Math.min(tw.length, 10);
        const d = normTitle(film.director || '');
        if (d && ` ${f} `.includes(` ${d} `)) s += 5;
        // A tiny one-word title ("Run") is too weak a sign on its own.
        return tw.length === 1 && t.length < 4 ? 55 : s;
    }
    // Most of the title's words are there (a typo or a word left out).
    const fw = new Set(words(f));
    const hits = tw.filter(w => fw.has(w)).length;
    if (tw.length >= 3 && hits / tw.length >= 0.75) return Math.round(60 * (hits / tw.length));
    return 0;
}

/**
 * The film this file most likely belongs to, or null when nothing fits well
 * or two films fit equally well (then Salome picks).
 */
export function guessFilm(fileName: string, films: FilmChoice[]): string | null {
    let best: string | null = null, bestScore = 0, tie = false;
    for (const film of films) {
        const s = matchScore(fileName, film);
        if (s > bestScore) { best = film.key; bestScore = s; tie = false; }
        else if (s === bestScore && s > 0) tie = true;
    }
    return bestScore >= 60 && !tie ? best : null;
}
