// Where to pick a film back up when a viewer moves from the phone/web to their Roku.
// Pure (tests/rokuResume.test.ts). Seconds in, seconds out; 0 means "start from the beginning".

const MIN_SECONDS = 10;          // not worth resuming a few seconds in
const NEAR_END_SECONDS = 120;    // within the last two minutes counts as finished

export function resumeSeconds(progress: unknown, runtimeMinutes?: number | null, watched = false): number {
    const p = Number(progress);
    if (watched || !Number.isFinite(p) || p < MIN_SECONDS) return 0;
    const total = Number(runtimeMinutes) > 0 ? Number(runtimeMinutes) * 60 : 0;
    if (total && p > total - NEAR_END_SECONDS) return 0;
    return Math.round(p);
}

/** Adds resumePosition to every feed item the viewer has started. Returns how many were marked. */
export function annotateResume(items: any[], progress: Record<string, number> | undefined, watched: string[] = []): number {
    if (!progress) return 0;
    const done = new Set(watched);
    let n = 0;
    for (const it of items) {
        const key = it?.id || it?.key;
        if (!key) continue;
        const s = resumeSeconds(progress[key], it?.durationInMinutes, done.has(key));
        if (s > 0) { it.resumePosition = s; n++; }
    }
    return n;
}

/** What a Roku may save: a plain whole number of seconds, or null if it is nonsense. */
export function cleanProgress(raw: unknown): number | null {
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 0 && n <= 24 * 3600 ? n : null;
}
