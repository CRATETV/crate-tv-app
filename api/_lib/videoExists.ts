// api/_lib/videoExists.ts
//
// Finds films whose video file is GONE from storage (Oct 2026). The Roku feed
// uses this so a film with no video is never listed (not in Top Ten, not in a
// row): before, such a film showed up, the Roku tried to play it and just
// sat on "loading".
//
// Careful by design: a film counts as missing ONLY when storage clearly says
// "not found" for every video address it has. Any doubt (storage slow, an
// error, no storage set up, a live stream, a series with episodes) means the
// film is kept. Answers are remembered for 10 minutes.
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { bucketStore } from './filmRemoval.js';
import { keysFromUrl } from './storageCleanup.js';

export type KeyCheck = (key: string) => Promise<'yes' | 'no' | 'unknown'>;

const MEMO_MS = 10 * 60 * 1000;
const memo = new Map<string, { at: number; v: 'yes' | 'no' | 'unknown' }>();

function isVideoAddress(u: unknown): u is string {
    if (typeof u !== 'string' || !/^https?:\/\//i.test(u)) return false;
    const l = u.toLowerCase();
    return !(l.includes('youtube.com') || l.includes('youtu.be') || l.includes('vimeo.com'));
}

/** Storage check for one key. Only a clear 404 / NoSuchKey says "no". */
export function storageKeyCheck(): KeyCheck | null {
    const store = bucketStore();
    if (!store) return null;
    return async (key: string) => {
        const hit = memo.get(key);
        if (hit && Date.now() - hit.at < MEMO_MS) return hit.v;
        let v: 'yes' | 'no' | 'unknown' = 'unknown';
        try {
            await store.client.send(new HeadObjectCommand({ Bucket: store.bucket, Key: key }));
            v = 'yes';
        } catch (e: any) {
            const status = e?.$metadata?.httpStatusCode;
            if (status === 404 || e?.name === 'NotFound' || e?.name === 'NoSuchKey') v = 'no';
        }
        memo.set(key, { at: Date.now(), v });
        return v;
    };
}

export interface FilmVideoCheck { key?: string; /** the address the Roku will actually be given */ address?: string; liveStreamUrl?: string; episodes?: { url?: string }[] }

/** Keys of films whose video file (the one the Roku would play) is confirmed missing. */
export async function findFilmsWithoutVideo(movies: FilmVideoCheck[], check: KeyCheck | null, timeoutMs = 2500): Promise<Set<string>> {
    const missing = new Set<string>();
    if (!check) return missing;
    const work = movies.map(async m => {
        if (!m?.key) return;
        if (m.liveStreamUrl) return;                                                    // live: nothing to look for
        if (Array.isArray(m.episodes) && m.episodes.some(e => isVideoAddress(e?.url))) return; // series: keep
        if (!isVideoAddress(m.address)) return;                                         // other rules already handle "no video"
        const keys = keysFromUrl(m.address);
        if (keys.length === 0) return;                                                  // not one of ours: keep
        const answers = await Promise.all(keys.map(k => check(k)));
        if (answers.every(x => x === 'no')) missing.add(m.key);                         // found, or any doubt: keep
    });
    // Slow storage must never slow the Roku down: whatever finished in time counts.
    await Promise.race([Promise.all(work), new Promise(r => setTimeout(r, timeoutMs))]);
    return missing;
}

/**
 * A film's Roku address can be out of date (an old file that was replaced) while the
 * main video address, the one the website plays, is fine. Given the addresses in order
 * of preference, returns the first one whose file is NOT confirmed missing, or null.
 */
export async function firstWorkingAddress(candidates: (string | undefined | null)[], check: KeyCheck | null): Promise<string | null> {
    if (!check) return null;
    const seen = new Set<string>();
    for (const c of candidates) {
        if (!isVideoAddress(c) || seen.has(c)) continue;
        seen.add(c);
        const keys = keysFromUrl(c);
        if (keys.length === 0) return c;                       // not one of ours: assume fine
        const answers = await Promise.all(keys.map(k => check(k)));
        if (!answers.every(x => x === 'no')) return c;          // found, or any doubt: usable
    }
    return null;
}
