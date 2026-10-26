// Measures a film's length from its video file, in whole minutes (rounded up).
// Used to fill in missing runtimes for festival blocks automatically: a block
// moves to its next film when the current film's runtime has passed, so a
// film without a runtime used to hold the whole block up (Oct 26 2026).
//
// Works for single video files (MP4/MOV) and HLS (.m3u8, from MediaConvert).
// Returns null if the length can't be read.

const TIMEOUT_MS = 20000;

function resolveUrl(base: string, ref: string): string {
    try { return new URL(ref, base).toString(); } catch { return ref; }
}

/** Total length of an HLS playlist (follows a master playlist to its first variant). */
export async function hlsDurationSeconds(url: string, fetcher: typeof fetch = fetch): Promise<number | null> {
    const text = await (await fetcher(url)).text();
    if (text.includes('#EXT-X-STREAM-INF')) {
        const lines = text.split(/\r?\n/);
        const i = lines.findIndex(l => l.startsWith('#EXT-X-STREAM-INF'));
        const variant = lines.slice(i + 1).find(l => l.trim() && !l.startsWith('#'));
        if (!variant) return null;
        return hlsDurationSeconds(resolveUrl(url, variant.trim()), fetcher);
    }
    return sumExtinf(text);
}

/** Adds up #EXTINF segment lengths. Pure, tested. */
export function sumExtinf(playlist: string): number | null {
    let total = 0, found = false;
    for (const m of playlist.matchAll(/#EXTINF:\s*([\d.]+)/g)) { total += Number(m[1]); found = true; }
    return found && Number.isFinite(total) && total > 0 ? total : null;
}

function videoDurationSeconds(url: string): Promise<number | null> {
    return new Promise(resolve => {
        const v = document.createElement('video');
        let done = false;
        const finish = (val: number | null) => { if (done) return; done = true; v.removeAttribute('src'); v.load(); resolve(val); };
        v.preload = 'metadata';
        v.muted = true;
        v.onloadedmetadata = () => finish(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
        v.onerror = () => finish(null);
        setTimeout(() => finish(null), TIMEOUT_MS);
        v.src = url;
    });
}

/** Minutes, rounded up, or null. */
export async function measureRuntimeMinutes(url: string | undefined | null): Promise<number | null> {
    if (!url) return null;
    try {
        const secs = /\.m3u8(\?|$)/i.test(url) ? await hlsDurationSeconds(url) : await videoDurationSeconds(url);
        if (!secs || secs < 30 || secs > 6 * 3600) return null;
        return Math.ceil(secs / 60);
    } catch {
        return null;
    }
}
