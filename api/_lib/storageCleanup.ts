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

export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.mkv', '.avi', '.webm', '.mpg', '.mpeg', '.wmv', '.mxf', '.ts', '.m3u8', '.m4s'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface BucketObject { Key: string; Size: number; LastModified?: string }
export interface PlanItem { key: string; size: number; reason: string }

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

/** Is this film still in use on CRATE? (see the list at the top) */
export function isFilmInUse(movie: any, keysInLiveBlocks: Set<string>, nowMs: number): boolean {
    if (!movie) return false;
    if (!movie.isUnlisted) return true;
    if (movie.partnerId) return true;
    if (movie.keepInCatalogAfterFestival) return true;
    if (keysInLiveBlocks.has(movie.key)) return true;
    if (movie.isWatchPartyEnabled) {
        const start = toMs(movie.watchPartyStartTime);
        if (start == null || start > nowMs - WEEK_MS) return true;
    }
    const until = toMs(movie.availableUntil);
    if (until != null && until > nowMs) return true;
    const premiered = toMs(movie.lastPremiereAt);
    if (premiered != null && premiered > nowMs - WEEK_MS) return true;
    return false;
}

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
export function buildPlan(objects: BucketObject[], data: any, nowMs: number): { plan: PlanItem[]; keptVideos: number; filmsInUse: number; filmsNotInUse: number } {
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
    let filmsInUse = 0, filmsNotInUse = 0;
    for (const [key, m] of Object.entries(movies)) {
        const film = { key, ...(m as any) };
        if (isFilmInUse(film, liveBlockFilms, nowMs)) {
            filmsInUse++;
            collectUrls(m).forEach(protect);
        } else {
            filmsNotInUse++;
            for (const u of collectUrls(m)) for (const k of keysFromUrl(u)) notInUse[k] = film.title || key;
        }
    }
    const { movies: _omit, ...rest } = data || {};
    collectUrls(rest).forEach(protect);

    const plan: PlanItem[] = [];
    let keptVideos = 0;
    for (const o of objects) {
        if (!o?.Key || !isVideoKey(o.Key)) continue;
        const inProtectedFolder = [...protectedFolders].some(f => o.Key.startsWith(f));
        if (protectedKeys.has(o.Key) || inProtectedFolder) { keptVideos++; continue; }
        const folderFilm = Object.entries(notInUse).find(([k]) => k.toLowerCase().endsWith('.m3u8') && o.Key.startsWith(k.slice(0, k.lastIndexOf('/') + 1)));
        const reason = notInUse[o.Key]
            ? `hidden film: ${notInUse[o.Key]}`
            : folderFilm ? `hidden film: ${folderFilm[1]}` : 'not used by any film on CRATE';
        plan.push({ key: o.Key, size: o.Size || 0, reason });
    }
    plan.sort((a, b) => b.size - a.size);
    return { plan, keptVideos, filmsInUse, filmsNotInUse };
}

export const gb = (bytes: number) => bytes / 1024 ** 3;
/** S3 Standard is about $0.023 per GB per month. */
export const monthlyCost = (bytes: number) => gb(bytes) * 0.023;

export interface PlanGroup { id: string; label: string; detail: string; reason: string; keys: string[]; size: number; isFolder: boolean }

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
        groups.set(id, g);
    }
    return [...groups.values()].sort((a, b) => b.size - a.size);
}

/** Refuse to plan from sample/fallback data (the real catalog has many films with video links). */
export function looksLikeRealCatalog(data: any): boolean {
    const films = Object.values(data?.movies || {}) as any[];
    return !!data && !data.error && films.length >= 10 && films.some(m => typeof m?.fullMovie === 'string' && m.fullMovie);
}
