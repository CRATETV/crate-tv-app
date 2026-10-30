// api/_lib/streamTiming.ts
//
// A watch party's film can only be fetched once the party has started.
// Someone with a ticket used to be able to ask the server for the video link
// any time before the start; the page just didn't show it. Now the server says
// "not yet" until the start time (15 seconds early so the picture is ready
// right at 0:00), or until an admin starts the party by hand. Tested:
// tests/streamTiming.test.ts.

import type { Firestore } from 'firebase-admin/firestore';
import { effectiveStatus, toMillis } from './watchPartyRules.js';

/** The video link is handed out this long before the scheduled start. */
export const STREAM_EARLY_MS = 15_000;

export type StreamGate = { open: true } | { open: false; startsAtMs: number | null; retryAfterSeconds: number };

/** Pure: may the live-party video be fetched right now? */
export function liveStreamGate(p: { partyState: any; scheduledStartMs: number | null; nowMs: number }): StreamGate {
    const { partyState, scheduledStartMs, nowMs } = p;
    const st = effectiveStatus(partyState, scheduledStartMs);
    if (st === 'live' || st === 'ended') return { open: true };
    if (scheduledStartMs != null && nowMs >= scheduledStartMs - STREAM_EARLY_MS) return { open: true };
    // No start time (an admin starts it by hand): check again soon. Otherwise
    // come back just as the link is due, but never wait more than 30 seconds.
    const wait = scheduledStartMs == null ? 8 : Math.ceil((scheduledStartMs - STREAM_EARLY_MS - nowMs) / 1000) + 1;
    return { open: false, startsAtMs: scheduledStartMs, retryAfterSeconds: Math.min(30, Math.max(2, wait)) };
}

/**
 * The party doc and scheduled start for a live-mode request. `movieKey` is a
 * festival block's id, a film that sits in a block (the block's party), or a
 * standalone film with its own watch party.
 */
export async function partyTimingFor(db: Firestore, movieKey: string): Promise<{ partyId: string; scheduledStartMs: number | null }> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    const blocks = daysSnap.docs.flatMap(d => (d.data().blocks || []) as any[]);
    let block = blocks.find(b => b?.id === movieKey) || blocks.find(b => Array.isArray(b?.movieKeys) && b.movieKeys.includes(movieKey));
    if (!block) {
        const cf = ((await db.collection('settings').doc('site').get()).data()?.crateFestConfig?.movieBlocks || []) as any[];
        block = cf.find(b => b?.id === movieKey) || cf.find(b => Array.isArray(b?.movieKeys) && b.movieKeys.includes(movieKey));
    }
    if (block) {
        // Same choice the scheduler makes (api/update-watch-parties.ts).
        return { partyId: block.id, scheduledStartMs: toMillis(block.watchPartyStartTime || block.screeningStartTime) };
    }
    const movie = (await db.collection('movies').doc(movieKey).get()).data();
    return { partyId: movieKey, scheduledStartMs: toMillis(movie?.watchPartyStartTime) };
}

/**
 * The same "not before the start" rule for the catalog (on-demand) player.
 * A film that has a watch party (it sits in a festival block, or has its own
 * party switched on) is only handed out once that party has started or ended.
 * Without this, someone with a ticket could open the regular film page before
 * the screening and watch it early. A film with no party at all is never held
 * back, and neither is one whose party has no start time and has never run
 * (nothing is scheduled, so there is nothing to protect).
 */
export async function onDemandStartGate(db: Firestore, movieKey: string, opts: { inBlock: boolean; movie: any }): Promise<StreamGate> {
    if (!opts.inBlock && opts.movie?.isWatchPartyEnabled !== true) return { open: true };
    const { partyId, scheduledStartMs } = await partyTimingFor(db, movieKey);
    const partyDoc = await db.collection('watch_parties').doc(partyId).get();
    const partyState = partyDoc.exists ? partyDoc.data() : undefined;
    if (scheduledStartMs == null && !partyState) return { open: true };
    return liveStreamGate({ partyState, scheduledStartMs, nowMs: Date.now() });
}
