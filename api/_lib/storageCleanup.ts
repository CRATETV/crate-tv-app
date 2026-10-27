// api/_lib/storageCleanup.ts
//
// Decides which VIDEO files in the S3 bucket can be deleted (Oct 2026).
// Used by Admin → Storage clean-up (api/admin-storage-cleanup.ts) and ops/storage/clean-bucket.ts; pure (no network) so it's tested in
// tests/bucketCleanup.test.ts.
//
// Salome's choice (Oct 26 2026): delete for good, and count hidden films and
// unused submission uploads as "not active".
//
// KEPT (never deleted), whatever else happens:
//   - anything that isn't a video file (posters, photos, site data, ...)
//   - every file any listed (visible) film uses
//   - hidden films that are still in use: an upcoming or live watch party
//     (e.g. a premiere kept hidden until the night), a "Hide automatically
//     after" date still to come, premiered in the last 7 days, or marked
//     "keep in catalog after festival"
//   - films in a festival block that hasn't finished its rewatch week yet,
//     or a block with no date set
//   - partner festival films (the partner tool cleans those up itself)
//   - anything else the site data points at (rows, settings, festival pages)
//   - a whole HLS folder (hsl/<name>/) when its playlist is in use
//   - anything uploaded in the last 2 days (it may still be converting)
//   - files the site's own code links to (website intro video, Roku's
//     built-in videos, built-in posters): api/_lib/codeLinkedFiles.ts

import { CODE_LINKED_URLS } from './codeLinkedFiles.js';

export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.mkv', '.avi', '.webm', '.mpg', '.mpeg', '.wmv', '.mxf', '.ts', '.m3u8', '.m4s'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface BucketObject { Key: string; Size: number; LastModified?: string }
export interface PlanItem { key: string; size: number; reason: string; filmKey?: string }

export const isVideoKey = (key: string) => {
    const k = key.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => k.endsWith(ext));
};

const toMs = (v: unknown): number | null => {
    if (typeof v !== 'string' || !v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
};

/** Every bucket key a URL could point at (virtual-hosted, path-style or CloudFront; "+" = space). */
export function keysFromUrl(url: string): string[] {
    let u: URL;
    try { u = new URL(url); } catch { return []; }
    if (!/^https?:$/.test(u.protocol)) return [];
    let path: string;
    try { path = decodeURIComponent(u.pathname.replace(/\+/g, ' ')); } catch { path = u.pathname.replace(/\+/g, ' '); }
    path = path.replace(/^\/+/, '');
    if (!path) return [];
    const out = new Set<string>([path]);
    // Path-style S3 (s3.amazonaws.com/<bucket>/<key>): also without the first folder.
    const slash = path.indexOf('/');
    if (slash > 0) out.add(path.slice(slash + 1));
    return [...out];
}

/** All URL strings anywhere inside a value. */
export function collectUrls(value: unknown, out: Set<string> = new Set(), depth = 0): Set<string> {
    if (depth > 12 || value == null) return out;
    if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value.trim())) out.add(value.trim());
        return out;
    }
    if (Array.isArray(value)) { for (const v of value) collectUrls(v, out, depth + 1); return out; }
    if (typeof value === 'object') { for (const v of Object.values(value as Record<string, unknown>)) collectUrls(v, out, depth + 1); }
    return out;
}

/** Why this film is still in use on CRATE (see the list at the top), or null if it isn't. */
export function whyInUse(movie: any, keysInLiveBlocks: Set<string>, nowMs: number): string | null {
    if (!movie) return null;
    if (!movie.isUnlisted) return 'showing on CRATE';
    if (movie.partnerId) return 'partner festival film';
    if (movie.keepInCatalogAfterFestival) return 'kept after its festival';
    if (keysInLiveBlocks.has(movie.key)) return 'in a festival block (rewatch week not over)';
    if (movie.isWatchPartyEnabled) {
        const start = toMs(movie.watchPartyStartTime);
        if (start == null || start > nowMs - WEEK_MS) return 'hidden, with a watch party coming up';
    }
    const until = toMs(movie.availableUntil);
    if (until != null && until > nowMs) return 'hidden, "Hide automatically after" date still to come';
    const premiered = toMs(movie.lastPremiereAt);
    if (premiered != null && premiered > nowMs - WEEK_MS) return 'premiered in the last week';
    return null;
}

/** Is this film still in use on CRATE? (see the list at the top) */
export function isFilmInUse(movie: any, keysInLiveBlocks: Set<string>, nowMs: number): boolean {
    return whyInUse(movie, keysInLiveBlocks, nowMs) != null;
}

export interface FilmListItem { key: string; title: string; why: string }

/** Film keys in festival blocks that haven't finished their rewatch week (or have no date). */
export function filmsInLiveBlocks(data: any, nowMs: number): Set<string> {
    const keys = new Set<string>();
    const blocks: any[] = [
        ...((data?.festivalData || []) as any[]).flatMap(d => d?.blocks || []),
        ...((data?.settings?.crateFestConfig?.movieBlocks || data?.crateFestConfig?.movieBlocks || []) as any[]),
    ];
    for (const b of blocks) {
        const ref = toMs(b?.festivalEndTime) ?? toMs(b?.screeningStartTime) ?? toMs(b?.watchPartyStartTime);
        if (ref == null || nowMs - ref < WEEK_MS) for (const k of b?.movieKeys || []) keys.add(k);
    }
    return keys;
}

/**
 * The delete plan: video files nothing in use points at.
 * `data` is the admin copy of the site data (films with their real video links).
 */
export function buildPlan(objects: BucketObject[], data: any, nowMs: number): { plan: PlanItem[]; keptVideos: number; filmsInUse: number; filmsNotInUse: number; inUseList: FilmListItem[]; notInUseList: FilmListItem[] } {
    const movies: Record<string, any> = data?.movies || {};
    const liveBlockFilms = filmsInLiveBlocks(data, nowMs);

    const protectedKeys = new Set<string>();
    const protectedFolders = new Set<string>();
    const protect = (url: string) => {
        for (const k of keysFromUrl(url)) {
            protectedKeys.add(k);
            if (k.toLowerCase().endsWith('.m3u8') && k.includes('/')) protectedFolders.add(k.slice(0, k.lastIndexOf('/') + 1));
        }
    };

    // Everything in the site data EXCEPT films not in use.
    const notInUse: Record<string, string> = {}; // key -> film title, for the report
    const notInUseFilm: Record<string, string> = {}; // key -> that film's catalog key
    const inUseFilms: { title: string; norm: string; plays: string }[] = [];
    let filmsInUse = 0, filmsNotInUse = 0;
    const inUseList: FilmListItem[] = [], notInUseList: FilmListItem[] = [];
    for (const [key, m] of Object.entries(movies)) {
        const film = { key, ...(m as any) };
        const why = whyInUse(film, liveBlockFilms, nowMs);
        if (why) {
            filmsInUse++;
            inUseList.push({ key, title: film.title || key, why });
            collectUrls(m).forEach(protect);
            const plays = typeof film.fullMovie === 'string' ? (keysFromUrl(film.fullMovie)[0] || '') : '';
            const norm = normName(film.title || '');
            if (norm.length >= 4) inUseFilms.push({ title: film.title, norm, plays });
        } else {
            filmsNotInUse++;
            notInUseList.push({ key, title: film.title || key, why: 'hidden' });
            for (const u of collectUrls(m)) for (const k of keysFromUrl(u)) { notInUse[k] = film.title || key; notInUseFilm[k] = key; }
        }
    }
    const { movies: _omit, ...rest } = data || {};
    collectUrls(rest).forEach(protect);
    CODE_LINKED_URLS.forEach(protect);

    // Extra safety: a file with the SAME NAME as one an in-use film plays (or
    // inside an HLS folder with the same folder name) is kept, in case the
    // film reaches it through a different web address.
    const protectedNames = new Set([...protectedKeys].filter(isVideoKey).map(k => baseName(k)));
    const protectedFolderNames = new Set([...protectedFolders].map(f => f.replace(/\/$/, '').split('/').pop()!.toLowerCase()));

    const plan: PlanItem[] = [];
    let keptVideos = 0;
    for (const o of objects) {
        if (!o?.Key || !isVideoKey(o.Key)) continue;
        const inProtectedFolder = [...protectedFolders].some(f => o.Key.startsWith(f));
        const folderName = o.Key.includes('/') ? o.Key.slice(0, o.Key.lastIndexOf('/')).split('/').pop()!.toLowerCase() : '';
        const isHlsPiece = /\.(ts|m3u8|m4s)$/i.test(o.Key);
        const sameName = protectedNames.has(baseName(o.Key)) && !isHlsPiece;
        const sameFolder = isHlsPiece && folderName !== '' && protectedFolderNames.has(folderName);
        // Uploaded in the last 2 days: may still be converting or not set on a film yet.
        const lm = o.LastModified ? Date.parse(o.LastModified) : NaN;
        const justUploaded = Number.isFinite(lm) && nowMs - lm < 2 * 24 * 60 * 60 * 1000;
        if (protectedKeys.has(o.Key) || inProtectedFolder || sameName || sameFolder || justUploaded) { keptVideos++; continue; }
        const folderFilm = Object.entries(notInUse).find(([k]) => k.toLowerCase().endsWith('.m3u8') && o.Key.startsWith(k.slice(0, k.lastIndexOf('/') + 1)));
        // A visible film whose title is in this file's name: it's an old
        // copy, or the original before it was converted for streaming.
        const fileNorm = normName(o.Key);
        const lookalike = inUseFilms.find(f => fileNorm.includes(f.norm));
        const reason = notInUse[o.Key]
            ? `hidden film: ${notInUse[o.Key]}`
            : folderFilm ? `hidden film: ${folderFilm[1]}`
            : lookalike ? `extra copy of "${lookalike.title}": CRATE plays a different file${lookalike.plays ? ` (${lookalike.plays})` : ''}`
            : 'not used by any film on CRATE';
        const filmKey = notInUse[o.Key] ? notInUseFilm[o.Key] : folderFilm ? notInUseFilm[folderFilm[0]] : undefined;
        plan.push({ key: o.Key, size: o.Size || 0, reason, ...(filmKey ? { filmKey } : {}) });
    }
    plan.sort((a, b) => b.size - a.size);
    const byTitle = (a: FilmListItem, b: FilmListItem) => a.title.localeCompare(b.title);
    return { plan, keptVideos, filmsInUse, filmsNotInUse, inUseList: inUseList.sort(byTitle), notInUseList: notInUseList.sort(byTitle) };
}

const baseName = (key: string) => key.split('/').pop()!.toLowerCase();
/** Lower case, letters and numbers only (so "The Mirror_Dance.mov" contains "themirrordance"). */
export const normName = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]{2,4}$/, '').replace(/[^a-z0-9]/g, '');

export const gb = (bytes: number) => bytes / 1024 ** 3;
/** S3 Standard is about $0.023 per GB per month. */
export const monthlyCost = (bytes: number) => gb(bytes) * 0.023;

export interface PlanGroup { id: string; label: string; detail: string; reason: string; keys: string[]; size: number; isFolder: boolean; filmKey?: string }

/**
 * One row per film file for the admin screen: an HLS folder (hundreds of
 * little .ts pieces) becomes a single row.
 */
export function groupPlan(plan: PlanItem[]): PlanGroup[] {
    const groups = new Map<string, PlanGroup>();
    for (const p of plan) {
        const lower = p.key.toLowerCase();
        const isHlsPiece = (lower.endsWith('.ts') || lower.endsWith('.m3u8') || lower.endsWith('.m4s')) && p.key.includes('/');
        const id = isHlsPiece ? p.key.slice(0, p.key.lastIndexOf('/') + 1) : p.key;
        const g = groups.get(id) || {
            id,
            label: isHlsPiece ? id.replace(/\/$/, '').split('/').pop() || id : p.key.split('/').pop() || p.key,
            detail: isHlsPiece ? `${id} (streaming version, several files)` : p.key,
            reason: p.reason,
            keys: [],
            size: 0,
            isFolder: isHlsPiece,
        };
        g.keys.push(p.key);
        g.size += p.size;
        if (g.reason.startsWith('not used') && p.reason.startsWith('hidden film')) g.reason = p.reason;
        if (!g.filmKey && p.filmKey) g.filmKey = p.filmKey;
        groups.set(id, g);
    }
    return [...groups.values()].sort((a, b) => b.size - a.size);
}

/** Refuse to plan from sample/fallback data (the real catalog has many films with video links). */
export function looksLikeRealCatalog(data: any): boolean {
    const films = Object.values(data?.movies || {}) as any[];
    return !!data && !data.error && films.length >= 10 && films.some(m => typeof m?.fullMovie === 'string' && m.fullMovie);
}

/** Film keys in ANY festival block (PWFF days or Crate Fest), past or future. */
export function filmsInAnyBlock(data: any): Set<string> {
    const keys = new Set<string>();
    const blocks: any[] = [
        ...((data?.festivalData || []) as any[]).flatMap(d => d?.blocks || []),
        ...((data?.settings?.crateFestConfig?.movieBlocks || data?.crateFestConfig?.movieBlocks || []) as any[]),
    ];
    for (const b of blocks) for (const k of b?.movieKeys || []) keys.add(k);
    return keys;
}

/**
 * May this film be removed from the catalog? (Salome, Oct 26 2026.) Used by
 * Films → "Remove selected" and by Storage clean-up. Never a film that earned
 * money: the Earnings page works out what each filmmaker earned, and is owed,
 * from the films in the catalog, so removing it would hide that money and make
 * it look like the filmmaker was overpaid. Never a festival or partner film,
 * or one with a watch party coming up or just held.
 * `earnedCents`: money each film earned, by title (lower case is fine). Null
 * when the money check couldn't run: then nothing is removed.
 */
export function filmRemovalCheck(filmKey: string, data: any, earnedCents: Record<string, number> | null, nowMs: number): { ok: true } | { ok: false; why: string } {
    const film = data?.movies?.[filmKey];
    if (!film) return { ok: false, why: 'already removed' };
    if (film.partnerId) return { ok: false, why: 'a partner festival film' };
    if (filmsInAnyBlock(data).has(filmKey)) return { ok: false, why: 'part of a festival schedule' };
    if (film.isWatchPartyEnabled) {
        const start = toMs(film.watchPartyStartTime);
        if (start == null || start > nowMs - WEEK_MS) return { ok: false, why: 'it has a watch party coming up or just held' };
    }
    const premiered = toMs(film.lastPremiereAt);
    if (premiered != null && premiered > nowMs - WEEK_MS) return { ok: false, why: 'it premiered in the last week' };
    if (earnedCents == null) return { ok: false, why: "couldn't check its earnings just now" };
    const title = String(film.title || '').trim();
    if ((earnedCents[title] || earnedCents[title.toLowerCase()] || 0) > 0) return { ok: false, why: 'it earned money, so it stays on your Earnings page' };
    return { ok: true };
}

/** Storage clean-up version: only hidden films nothing needs any more. */
export function catalogRemoval(filmKey: string, data: any, earnedCents: Record<string, number> | null, nowMs: number): { ok: true } | { ok: false; why: string } {
    const film = data?.movies?.[filmKey];
    if (!film) return { ok: false, why: 'already removed' };
    if (isFilmInUse({ key: filmKey, ...film }, filmsInLiveBlocks(data, nowMs), nowMs)) return { ok: false, why: 'still in use' };
    return filmRemovalCheck(filmKey, data, earnedCents, nowMs);
}

/**
 * The bucket files that belong ONLY to this film: its video (a whole HLS
 * folder for a streaming version), poster, trailer, photos... Anything another
 * film or the rest of the site also uses is left alone.
 */
export function filmOnlyFiles(filmKey: string, data: any, objects: BucketObject[]): { keys: string[]; size: number } {
    const film = data?.movies?.[filmKey];
    if (!film) return { keys: [], size: 0 };
    const exists = new Map(objects.map(o => [o.Key, o]));

    // What everything else uses.
    const othersKeys = new Set<string>();
    const othersFolders = new Set<string>();
    const others: any = { ...(data || {}), movies: { ...(data?.movies || {}) } };
    delete others.movies[filmKey];
    for (const u of [...collectUrls(others), ...CODE_LINKED_URLS]) for (const k of keysFromUrl(u)) {
        othersKeys.add(k);
        if (k.toLowerCase().endsWith('.m3u8') && k.includes('/')) othersFolders.add(k.slice(0, k.lastIndexOf('/') + 1));
    }

    const mine = new Set<string>();
    for (const u of collectUrls(film)) for (const k of keysFromUrl(u)) {
        if (!exists.has(k)) continue;
        if (k.toLowerCase().endsWith('.m3u8') && k.includes('/')) {
            const folder = k.slice(0, k.lastIndexOf('/') + 1);
            if (othersFolders.has(folder)) continue;
            for (const o of objects) if (o.Key.startsWith(folder)) mine.add(o.Key);
        } else {
            mine.add(k);
        }
    }
    const keys = [...mine].filter(k => !othersKeys.has(k) && ![...othersFolders].some(f => k.startsWith(f))).sort();
    return { keys, size: keys.reduce((s, k) => s + (exists.get(k)?.Size || 0), 0) };
}
