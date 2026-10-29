// api/_lib/watchStats.ts — "where do people stop?" numbers for one film (Oct 29 2026).
//
// The player reports which TENTH of the film a viewer is naturally watching
// (0 = first 10%, ... 9 = last 10%), plus one "finished" when they reach 95%.
// Each film keeps counters: starts, d0..d9, fin. Seeking ahead doesn't count
// as watching the skipped part (see components/useWatchReporter.ts).
//
// Tested: tests/watchStats.test.ts.

export const BINS = 10;

export interface WatchCounts { starts: number; bins: number[]; fin: number }
export interface WatchSummary {
    plays: number;
    finished: number;
    finishRate: number | null;          // 0..1, null until anyone has played
    stillWatching: number[];            // per tenth: share (0..1) of plays that watched it
    biggestDrop: { fromPct: number; toPct: number; lostShare: number } | null;
    enough: boolean;                    // too few plays to say anything fair
}

/** Which tenth of the film is this moment in? -1 when it can't be told. */
export function binOf(seconds: number, duration: number): number {
    if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0 || seconds < 0) return -1;
    return Math.min(BINS - 1, Math.floor((seconds / duration) * BINS));
}

/** Reached the credits (95%+)? */
export function isFinished(seconds: number, duration: number): boolean {
    return Number.isFinite(seconds) && Number.isFinite(duration) && duration > 0 && seconds / duration >= 0.95;
}

/** Add up the counters from every shard document. */
export function sumShards(shards: Array<Record<string, unknown> | undefined>): WatchCounts {
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
    const out: WatchCounts = { starts: 0, bins: Array(BINS).fill(0), fin: 0 };
    for (const s of shards) {
        if (!s) continue;
        out.starts += n(s.starts);
        out.fin += n(s.fin);
        for (let i = 0; i < BINS; i++) out.bins[i] += n(s[`d${i}`]);
    }
    return out;
}

export function summarizeWatch(c: WatchCounts): WatchSummary {
    const plays = c.starts;
    const share = (v: number) => (plays > 0 ? Math.min(1, v / plays) : 0);
    const stillWatching = c.bins.map(share);
    let biggestDrop: WatchSummary['biggestDrop'] = null;
    if (plays > 0) {
        const curve = [1, ...stillWatching]; // everybody starts; then each tenth
        for (let i = 0; i < BINS; i++) {
            const lost = curve[i] - curve[i + 1];
            if (lost > 0 && (!biggestDrop || lost > biggestDrop.lostShare)) {
                biggestDrop = { fromPct: i * 10, toPct: (i + 1) * 10, lostShare: lost };
            }
        }
    }
    return {
        plays,
        finished: c.fin,
        finishRate: plays > 0 ? Math.min(1, c.fin / plays) : null,
        stillWatching,
        biggestDrop,
        enough: plays >= 10,
    };
}
