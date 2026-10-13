// api/_lib/watchPartyLifecycle.ts
//
// One home for the rules that move a watch party through its life:
//   scheduled → live → (film → intermission → film …) → ended
//
// Before October 2026 these rules were copied across several endpoints and
// the every-minute cron, and the copies had drifted apart. Three real
// problems came out of that drift (see the Oct 2026 platform audit):
//
//   1. The cron re-started blocks that had already ended, because it only
//      asked "is this party live?" — an ended party isn't, so it qualified.
//   2. A block could freeze between films: advancing depended on a viewer's
//      browser asking at the right moment, and the admin "Next Film" button
//      went through the same runtime check with no way to override it.
//   3. The cron's auto-end step called the site over HTTP, which Vercel's
//      deployment protection can silently block.
//
// The server is now the clock. The cron calls these functions directly
// every minute, viewers' browsers may still call them (harmless — every
// step is idempotent and transactional), and admins can force an advance.

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { sendWatchPartyReport } from './sendWatchPartyReport.js';
import { setBackstageKey } from './backstage.js';
import { assembleAndSyncMasterData } from '../publish-data.js';

export {
    ADVANCE_EARLY_TOLERANCE_MS, SERVER_ADVANCE_GRACE_MS, AUTO_END_GRACE_MS, UNKNOWN_RUNTIME_MS,
    toMillis, shouldAutoStart, runtimeMs, intermissionSecondsFor, blockAccessExpiry,
} from './watchPartyRules.js';
import {
    ADVANCE_EARLY_TOLERANCE_MS, AUTO_END_GRACE_MS, UNKNOWN_RUNTIME_MS,
    toMillis, runtimeMs, intermissionSecondsFor,
} from './watchPartyRules.js';

// ─────────────────────────────────────────────────────────────────────────
// Database helpers
// ─────────────────────────────────────────────────────────────────────────

export interface BlockLookup {
    block: any;
    dayRef: FirebaseFirestore.DocumentReference;
    movieKeys: string[];
    source: 'festival' | 'crateFest';
}

/** Finds a block by id in the festival schedule, then in CrateFest config. */
export async function findBlock(db: Firestore, blockId: string): Promise<BlockLookup | null> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    for (const dayDoc of daysSnap.docs) {
        const blocks = (dayDoc.data().blocks || []) as any[];
        const match = blocks.find(b => b?.id === blockId);
        if (match) return { block: match, dayRef: dayDoc.ref, movieKeys: match.movieKeys || [], source: 'festival' };
    }
    const settingsDoc = await db.collection('settings').doc('site').get();
    const crateFestBlocks = settingsDoc.data()?.crateFestConfig?.movieBlocks || [];
    const cf = crateFestBlocks.find((b: any) => b?.id === blockId);
    if (cf) return { block: cf, dayRef: settingsDoc.ref, movieKeys: cf.movieKeys || [], source: 'crateFest' };
    return null;
}

async function filmRuntimeMs(db: Firestore, filmKey: string | null | undefined): Promise<number> {
    if (!filmKey) return UNKNOWN_RUNTIME_MS;
    const movieDoc = await db.collection('movies').doc(filmKey).get();
    return runtimeMs(movieDoc.data()?.durationInMinutes);
}

export type AdvanceResult =
    | { kind: 'already-advanced'; serverIndex: number }
    | { kind: 'not-ready'; message: string; readyAtMs?: number }
    | { kind: 'not-live' }
    | { kind: 'last-film' }
    | { kind: 'advanced'; nextIndex: number; intermissionEnd: number };

/**
 * Moves a live block to its next film.
 *
 * - `currentIndex` guards against double-advancing: if the party has
 *   already moved past it, nothing happens.
 * - Without `force`, the current film's recorded runtime must have elapsed
 *   (minus `toleranceMs`). With `force` (admin only), it advances now.
 * - Never ends the party — on the last film it returns 'last-film' and
 *   leaves ending to tryAutoEnd / an admin, so every end goes through the
 *   same clean-up path.
 */
export async function tryAdvanceBlock(db: Firestore, opts: {
    partyId: string;
    currentIndex?: number;
    force?: boolean;
    toleranceMs?: number;
    lookup?: BlockLookup | null;
}): Promise<AdvanceResult> {
    const { partyId, force = false, toleranceMs = ADVANCE_EARLY_TOLERANCE_MS } = opts;
    const lookup = opts.lookup !== undefined ? opts.lookup : await findBlock(db, partyId);
    const movieKeys = lookup?.movieKeys || [];
    if (movieKeys.length === 0) return { kind: 'not-ready', message: 'Not a festival block.' };

    const partyRef = db.collection('watch_parties').doc(partyId);

    // Runtime is read outside the transaction (it's catalog data, not party
    // state); the index it belongs to is re-checked inside.
    const pre = (await partyRef.get()).data();
    const preIndex = pre?.activeMovieIndex ?? 0;
    const durationMs = await filmRuntimeMs(db, movieKeys[Math.min(preIndex, movieKeys.length - 1)]);

    return db.runTransaction(async (tx): Promise<AdvanceResult> => {
        const data = (await tx.get(partyRef)).data();
        if (data?.status !== 'live') return { kind: 'not-live' };
        const serverIndex = data?.activeMovieIndex ?? 0;
        const expected = opts.currentIndex ?? serverIndex;
        if (serverIndex !== expected || serverIndex !== preIndex) {
            return { kind: 'already-advanced', serverIndex };
        }
        const nextIndex = serverIndex + 1;
        if (nextIndex >= movieKeys.length) return { kind: 'last-film' };

        if (!force) {
            const startMs = toMillis(data?.filmStartTime) ?? toMillis(data?.actualStartTime);
            if (startMs == null) return { kind: 'not-ready', message: 'No film start time recorded yet.' };
            const readyAtMs = startMs + durationMs - toleranceMs;
            if (Date.now() < readyAtMs) {
                return { kind: 'not-ready', message: 'Current film has not finished yet.', readyAtMs };
            }
        }

        const { seconds, isStretchBreak } = intermissionSecondsFor(nextIndex, movieKeys.length);
        const intermissionEnd = Date.now() + seconds * 1000;
        tx.update(partyRef, {
            activeMovieIndex: nextIndex,
            intermissionUntil: intermissionEnd,
            intermissionTotalSeconds: seconds,
            isStretchBreak,
            // The next film starts when the intermission ends, so "elapsed
            // since filmStartTime" reads ~0 for everyone at that moment.
            filmStartTime: new Date(intermissionEnd),
            isPlaying: true,
            currentTime: 0,
            lastUpdated: FieldValue.serverTimestamp(),
            ...(force ? { lastForcedAdvanceAt: FieldValue.serverTimestamp() } : {}),
        });
        return { kind: 'advanced', nextIndex, intermissionEnd };
    });
}

/**
 * Shared shutdown steps for any ended party (admin "End Party", automatic
 * end, or the cron). Safe to run more than once.
 */
export async function finalizeEndedParty(db: Firestore, partyId: string, lookup?: BlockLookup | null): Promise<void> {
    const block = lookup !== undefined ? lookup : await findBlock(db, partyId);

    // Homepage banner + standalone-movie schedule fields.
    await db.collection('watch_party_schedule').doc(partyId).update({ isWatchPartyEnabled: false }).catch(() => {});
    await db.collection('movies').doc(partyId).update({ watchPartyStartTime: null, isWatchPartyEnabled: false }).catch(() => {});
    await db.collection('data').doc('movies').update({
        [`${partyId}.watchPartyStartTime`]: null,
        [`${partyId}.isWatchPartyEnabled`]: false,
    }).catch(() => {});

    if (!block || block.source !== 'festival') return;

    // Stamp festivalEndTime on the block (drives the 7-day rewatch window,
    // and is what stops the scheduler from ever re-starting this block).
    try {
        const dayDoc = await block.dayRef.get();
        const blocks = (dayDoc.data()?.blocks || []) as any[];
        const idx = blocks.findIndex(b => b?.id === partyId);
        if (idx >= 0) {
            blocks[idx] = { ...blocks[idx], festivalEndTime: new Date().toISOString() };
            await block.dayRef.update({ blocks });
        }
    } catch (e) {
        console.error('[lifecycle] Failed to stamp festivalEndTime for', partyId, e);
    }

    if (block.movieKeys.length > 0) {
        sendWatchPartyReport(db, partyId, block.block.title || '', block.movieKeys)
            .catch(e => console.error('[lifecycle] Watch party report email failed:', e));
    }

    if (block.block.releaseAfterScreening && block.movieKeys.length > 0) {
        await Promise.all(block.movieKeys.map(key =>
            db.collection('movies').doc(key).update({ isUnlisted: false }).catch(() => {})
        ));
        // The live site reads a published snapshot, so republish to make
        // the release visible.
        try { await assembleAndSyncMasterData(db); }
        catch (e) { console.error('[lifecycle] Post-release republish failed:', e); }
    }
}

export type AutoEndResult =
    | { kind: 'ended' }
    | { kind: 'already-ended' }
    | { kind: 'not-ready'; message: string };

/**
 * Ends a live party once its last (or only) film has finished plus
 * AUTO_END_GRACE_MS, judged entirely from server-side data.
 */
export async function tryAutoEnd(db: Firestore, partyId: string): Promise<AutoEndResult> {
    const partyRef = db.collection('watch_parties').doc(partyId);
    const lookup = await findBlock(db, partyId);
    const movieKeys = lookup?.movieKeys || [];

    const pre = (await partyRef.get()).data();
    if (!pre) return { kind: 'not-ready', message: 'Party not found.' };
    if (pre.status === 'ended') return { kind: 'already-ended' };

    const idx = pre.activeMovieIndex ?? 0;
    const isBlock = movieKeys.length > 0;
    if (isBlock && idx < movieKeys.length - 1) return { kind: 'not-ready', message: 'Not the last film in the block.' };
    const filmKey = isBlock ? movieKeys[Math.min(idx, movieKeys.length - 1)] : partyId;
    const durationMs = await filmRuntimeMs(db, filmKey);

    const outcome = await db.runTransaction(async (tx): Promise<AutoEndResult> => {
        const data = (await tx.get(partyRef)).data();
        if (!data) return { kind: 'not-ready', message: 'Party not found.' };
        if (data.status === 'ended') return { kind: 'already-ended' };
        if (data.status !== 'live') return { kind: 'not-ready', message: `Party status is '${data.status}', not live.` };
        if ((data.activeMovieIndex ?? 0) !== idx) return { kind: 'not-ready', message: 'Film changed; re-check next tick.' };

        const startMs = toMillis(data.filmStartTime) ?? toMillis(data.actualStartTime);
        if (startMs == null) return { kind: 'not-ready', message: 'No film start time recorded yet.' };
        if (Date.now() < startMs + durationMs + AUTO_END_GRACE_MS) {
            return { kind: 'not-ready', message: 'Grace period has not elapsed yet.' };
        }

        tx.update(partyRef, {
            status: 'ended',
            isPlaying: false,
            actualStartTime: null,
            currentTime: 0,
            backstageKey: null,
            lastUpdated: FieldValue.serverTimestamp(),
            endedAt: FieldValue.serverTimestamp(),
        });
        return { kind: 'ended' };
    });

    if (outcome.kind === 'ended') {
        await setBackstageKey(db, partyId, null);
        await finalizeEndedParty(db, partyId, lookup);
        console.log(`[lifecycle] Party ${partyId} automatically ended.`);
    }
    return outcome;
}

/**
 * Deletes every doc in a party's chat in chunks of 400. A single Firestore
 * batch is capped at 500 writes, so a busy party's chat used to make the
 * purge throw — which blocked the party from starting at all.
 */
export async function purgePartyMessages(db: Firestore, partyId: string): Promise<number> {
    const ref = db.collection('watch_parties').doc(partyId).collection('messages');
    let deleted = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snap = await ref.limit(400).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += snap.size;
        if (snap.size < 400) break;
    }
    return deleted;
}

/** Short code a director types to join the live Q&A. Uses crypto, not Math.random. */
export function newBackstageKey(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
    const bytes = new Uint8Array(6);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
