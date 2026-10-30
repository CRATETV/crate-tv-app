import { Firestore } from 'firebase-admin/firestore';
import { isOutsidePartner, selectPwffDays } from './partnerRules.js';
import { isFestivalPassActive } from './festivalPass.js';

export type AccessMode = 'ondemand' | 'live';

export interface MovieAccessCheck {
    uid?: string;
    deviceId?: string;
    movieKey: string;
    /**
     * 'ondemand' = the catalog player (components/MoviePage.tsx) — movieKey is always an
     *   individual film's own key; a festival film only becomes individually rewatchable
     *   once its block's watch party has actually ENDED.
     * 'live' = the watch-party player (components/WatchPartyPage.tsx) — movieKey can be
     *   EITHER an individual film's key (a standalone, non-block watch party) OR a festival
     *   block's own id (a multi-film block watch party — the movie shown is whichever film
     *   is "active" within that block, per watch_parties/{blockId}.activeMovieIndex, same as
     *   WatchPartyPage.tsx's own `movie` useMemo resolves it client-side). No "ended" gate,
     *   since this mode IS the pre/at-ended experience.
     * These two pages have genuinely different, independently-evolved access rules on the
     * client (see the comments below) — this mirrors both exactly rather than picking one.
     */
    mode: AccessMode;
}

export interface MovieAccessResult {
    granted: boolean;
    /** The movies/{key} doc whose fullMovie should actually be signed — may differ from the
     *  requested movieKey when movieKey is a festival block's own id (see mode: 'live' above).
     *  Null when it couldn't be resolved (e.g. movieKey matches nothing at all). */
    filmKey: string | null;
}

interface FestivalBlock { id: string; price: number; movieKeys: string[]; day?: number; partnerId?: string; /** Part of the PWFF schedule (the only blocks the PWFF all-access pass opens). */ inPwff?: boolean; }

/**
 * Resolves whether a user (by uid, or by Roku deviceId via roku_links) has real access to
 * a movie, replicating the exact client-side hasAccess logic in MoviePage.tsx ('ondemand')
 * or WatchPartyPage.tsx ('live') — including their known asymmetries (e.g. jury pass grants
 * access on the catalog page but was never wired into the watch-party page's own check; the
 * live page also checks unlockedFestivalBlockIds against the raw movieKey in addition to the
 * parent block's id). This is intentionally NOT "corrected" to be more consistent — the goal
 * is to grant exactly what each real page's UI already promises, no more and no less, since
 * granting less breaks legitimate paying customers and granting more is a real leak.
 *
 * Jury Passes are no longer sold (Grand Jury removed Oct 2026). hasJuryPass is still
 * honored so anyone who bought one before keeps the full access they paid for. The old
 * client-only "guest jury" localStorage flag has been removed entirely.
 *
 * One deliberate exception to "mirror the client exactly": mode 'live' for a standalone
 * (non-block) movie does NOT mirror WatchPartyPage.tsx's `if (!movie.isWatchPartyPaid)
 * return true` fallback as-is — see the inline comment at that branch below for why.
 */
export async function resolveMovieAccess(db: Firestore, { uid, deviceId, movieKey, mode }: MovieAccessCheck): Promise<MovieAccessResult> {
    const resolvedUid = uid || (deviceId ? await resolveUidFromDeviceId(db, deviceId) : undefined);
    if (!resolvedUid || !movieKey) return { granted: false, filmKey: null };

    const userData = (await db.collection('users').doc(resolvedUid).get()).data() || {};
    const now = new Date();

    // A full festival pass is good for one festival (its end date), not forever.
    const hasFestivalAllAccess = isFestivalPassActive(userData, now.getTime());
    const hasJuryPass = userData.hasJuryPass === true;
    const unlockedBlocks: Record<string, string> = userData.unlockedBlocks || {};
    // Day passes are honoured through the dated block unlocks they grant.
    // (Old day passes only stored a day NUMBER — "day 1" — which would have
    // opened day 1 of every future festival, so that number is no longer used.)
    const isBlockUnlocked = (blockId: string) => {
        const exp = unlockedBlocks[blockId];
        if (exp && new Date(exp) > now) return true;
        return Array.isArray(userData.unlockedBlockIds) && userData.unlockedBlockIds.includes(blockId);
    };
    const unlockedWatchPartyKeys: string[] = userData.unlockedWatchPartyKeys || [];
    const rentals: Record<string, string> = userData.rentals || {};
    const isRented = (key: string) => {
        const exp = rentals[key];
        return !!(exp && new Date(exp) > now);
    };

    if (mode === 'live') {
        // movieKey might BE a festival block's own id (a multi-film block watch party) —
        // check that first, since a block id was never a real movies/{key} doc to begin with.
        const directBlock = await findBlockById(db, movieKey);
        if (directBlock) {
            const filmKey = await resolveActiveFilmKey(db, directBlock);
            let granted = false;
            if (unlockedWatchPartyKeys.includes(movieKey)) granted = true;
            // The PWFF all-access pass never covers partner festivals.
            else if (hasFestivalAllAccess && directBlock.inPwff) granted = true;
            else if (isBlockUnlocked(movieKey)) granted = true;
            else if (directBlock.price === 0) granted = true;
            else granted = isRented(movieKey);
            return { granted, filmKey };
        }

        // Otherwise movieKey is an individual film (a standalone watch party, or a festival
        // film accessed directly by its own key rather than through its block).
        const movieSnap = await db.collection('movies').doc(movieKey).get();
        if (!movieSnap.exists) return { granted: false, filmKey: null };
        const movieData = movieSnap.data() || {};
        const parentBlock = await findParentFestivalBlock(db, movieKey);

        let granted = false;
        if (unlockedWatchPartyKeys.includes(movieKey)) granted = true;
        // A festival pass opens festival films only. A standalone paid watch
        // party (no festival block) used to fall into this line too, so every
        // pass holder got every paid watch party free (found Oct 23 2026).
        else if (parentBlock && hasFestivalAllAccess && parentBlock.inPwff) granted = true;
        else if (isBlockUnlocked(movieKey)) granted = true;
        else if (parentBlock) {
            if (isBlockUnlocked(parentBlock.id)) granted = true;
            else if (parentBlock.price === 0) granted = true;
            else granted = isRented(movieKey);
        } else if (!movieData.isForSale && !movieData.isWatchPartyPaid) {
            // Genuinely free content — safe to grant regardless of whether it's
            // specifically flagged watch-party-enabled, matching MoviePage.tsx's own
            // equivalent free-check (!movie.isForSale). Using isForSale here rather
            // than isWatchPartyEnabled avoids a narrower version of the same bug: a
            // plain free movie that isn't watch-party content would otherwise have no
            // grant path left below and 403 for no real reason.
            granted = true;
        } else if (movieData.isWatchPartyPaid) {
            granted = isRented(movieKey);
        }
        // SECURITY: deliberately NOT mirroring WatchPartyPage.tsx's own client-side
        // `if (!movie.isWatchPartyPaid) return true;` fallback here. On the client
        // that's low-stakes (real navigation never reaches a non-watch-party movie
        // via /watchparty/, and fullMovie used to be public anyway) — but this is
        // now the real authoritative gate, and `isWatchPartyPaid` is undefined/false
        // for EVERY plain VOD movie regardless of isForSale, which would silently
        // hand out a free signed URL for any paid rental via mode:'live'. Confirmed
        // live against a real $7.99 paid title before this fix (isForSale: true,
        // isWatchPartyEnabled: false) — the check above returned granted:true. A
        // paid, non-watch-party movie has no legitimate grant path through mode
        // 'live' — falls through to the granted:false default instead.

        return { granted, filmKey: movieKey };
    }

    // mode === 'ondemand' — movieKey is always an individual film's own key here
    // (MoviePage.tsx never operates on a block id directly).
    const movieSnap = await db.collection('movies').doc(movieKey).get();
    if (!movieSnap.exists) return { granted: false, filmKey: null };
    const movieData = movieSnap.data() || {};
    const parentBlock = await findParentFestivalBlock(db, movieKey);

    let granted = false;
    if (hasJuryPass) granted = true;
    else if (parentBlock) {
        const status = await getPartyStatus(db, parentBlock.id);
        if ((hasFestivalAllAccess && parentBlock.inPwff) || isBlockUnlocked(parentBlock.id) || unlockedWatchPartyKeys.includes(parentBlock.id)) {
            granted = status === 'ended';
        } else if (parentBlock.price === 0) {
            // Only a block priced at exactly $0 is free. A block with no
            // price set counts as paid (same as the watch party rule above).
            granted = true;
        } else if (status === 'ended' && isRented(movieKey)) {
            granted = true;
        }
    } else if (!movieData.isForSale) {
        // A paid watch party film used to be free here: it isn't "for sale",
        // so opening its regular film page played it without a ticket
        // (found Oct 23 2026). Now it needs the party ticket or a rental.
        granted = movieData.isWatchPartyPaid === true
            ? (unlockedWatchPartyKeys.includes(movieKey) || isRented(movieKey))
            : true;
    } else {
        granted = isRented(movieKey);
    }

    return { granted, filmKey: movieKey };
}

async function resolveUidFromDeviceId(db: Firestore, deviceId: string): Promise<string | undefined> {
    const linkDoc = await db.collection('roku_links').doc(deviceId).get();
    if (!linkDoc.exists) return undefined;
    return linkDoc.data()?.userId;
}

async function getFestivalBlocks(db: Firestore): Promise<FestivalBlock[]> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    const dayData = daysSnap.docs.map(d => d.data() || {});
    // The PWFF pass opens the PWFF schedule only. Older days left in the
    // schedule (last year's, or ones entered before the committee lineup was
    // published) are not part of it, and a partner festival never is.
    const pwffDays = new Set<any>(selectPwffDays(dayData as any[]));
    const blocks: FestivalBlock[] = [];
    for (const d of dayData as any[]) {
        for (const b of (d.blocks || [])) {
            if (b?.id) blocks.push({ id: b.id, price: b.price, movieKeys: Array.isArray(b.movieKeys) ? b.movieKeys : [], day: isOutsidePartner(d.partnerId) ? undefined : d.day, partnerId: b.partnerId || d.partnerId || undefined, inPwff: pwffDays.has(d) && !isOutsidePartner(b.partnerId || d.partnerId) });
        }
    }
    return blocks;
}

async function findBlockById(db: Firestore, blockId: string): Promise<FestivalBlock | null> {
    const blocks = await getFestivalBlocks(db);
    return blocks.find(b => b.id === blockId) || null;
}

async function findParentFestivalBlock(db: Firestore, movieKey: string): Promise<FestivalBlock | null> {
    const blocks = await getFestivalBlocks(db);
    return blocks.find(b => b.movieKeys.includes(movieKey)) || null;
}

async function getPartyStatus(db: Firestore, blockId: string): Promise<string | undefined> {
    const doc = await db.collection('watch_parties').doc(blockId).get();
    return doc.exists ? doc.data()?.status : undefined;
}

/** Mirrors WatchPartyPage.tsx's own `movie` useMemo: whichever film in the block is
 *  "active" per the party doc's activeMovieIndex, clamped the same way (Math.min against
 *  the block's own film count) so a stale/out-of-range index never throws. */
async function resolveActiveFilmKey(db: Firestore, block: FestivalBlock): Promise<string | null> {
    if (block.movieKeys.length === 0) return null;
    const partyDoc = await db.collection('watch_parties').doc(block.id).get();
    const idx = partyDoc.exists ? (partyDoc.data()?.activeMovieIndex ?? 0) : 0;
    const safeIdx = Math.min(Math.max(0, idx), block.movieKeys.length - 1);
    return block.movieKeys[safeIdx];
}
