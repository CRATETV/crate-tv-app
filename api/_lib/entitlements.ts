import { Firestore } from 'firebase-admin/firestore';

export type AccessMode = 'ondemand' | 'live';

export interface MovieAccessCheck {
    uid?: string;
    deviceId?: string;
    movieKey: string;
    /**
     * 'ondemand' = the catalog player (components/MoviePage.tsx) — a festival film only
     *   becomes individually rewatchable once its block's watch party has actually ENDED.
     * 'live' = the watch-party player (components/WatchPartyPage.tsx) — the pre/at-ended
     *   experience itself, so it has no "ended" gate (that would be a contradiction).
     * These two pages have genuinely different, independently-evolved access rules on the
     * client (see the comments below) — this mirrors both exactly rather than picking one.
     */
    mode: AccessMode;
}

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
 * Known, accepted gap: MoviePage.tsx's client-only "guest jury" localStorage flag
 * (crate_guest_jury_active) has no server-side equivalent and is not checked here — an
 * internal preview/testing mechanism, not a real entitlement, so a guest-jury tester's
 * client will show a play button that this endpoint won't yet honor.
 */
export async function resolveMovieAccess(db: Firestore, { uid, deviceId, movieKey, mode }: MovieAccessCheck): Promise<boolean> {
    const resolvedUid = uid || (deviceId ? await resolveUidFromDeviceId(db, deviceId) : undefined);
    if (!resolvedUid || !movieKey) return false;

    const [userSnap, movieSnap] = await Promise.all([
        db.collection('users').doc(resolvedUid).get(),
        db.collection('movies').doc(movieKey).get(),
    ]);
    if (!movieSnap.exists) return false;
    const userData = userSnap.data() || {};
    const movieData = movieSnap.data() || {};
    const now = new Date();

    const hasFestivalAllAccess = userData.hasFestivalAllAccess === true ||
        !!(userData.festivalPassExpiry && new Date(userData.festivalPassExpiry) > now);
    const hasJuryPass = userData.hasJuryPass === true;
    const unlockedBlocks: Record<string, string> = userData.unlockedBlocks || {};
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

    const parentBlock = await findParentFestivalBlock(db, movieKey);

    if (mode === 'ondemand') {
        if (hasJuryPass) return true;
        if (parentBlock) {
            const status = await getPartyStatus(db, parentBlock.id);
            if (hasFestivalAllAccess || isBlockUnlocked(parentBlock.id) || unlockedWatchPartyKeys.includes(parentBlock.id)) {
                return status === 'ended';
            }
            if (!(parentBlock.price > 0)) return true;
            if (status === 'ended' && isRented(movieKey)) return true;
            return false;
        }
        if (!movieData.isForSale) return true;
        return isRented(movieKey);
    }

    // mode === 'live'
    if (unlockedWatchPartyKeys.includes(movieKey)) return true;
    if (hasFestivalAllAccess) return true;
    if (isBlockUnlocked(movieKey)) return true;
    if (parentBlock) {
        if (isBlockUnlocked(parentBlock.id)) return true;
        if (parentBlock.price === 0) return true;
        return isRented(movieKey);
    }
    if (!movieData.isWatchPartyPaid) return true;
    return isRented(movieKey);
}

async function resolveUidFromDeviceId(db: Firestore, deviceId: string): Promise<string | undefined> {
    const linkDoc = await db.collection('roku_links').doc(deviceId).get();
    if (!linkDoc.exists) return undefined;
    return linkDoc.data()?.userId;
}

async function findParentFestivalBlock(db: Firestore, movieKey: string): Promise<{ id: string; price: number } | null> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    for (const d of daysSnap.docs) {
        const blocks = d.data().blocks || [];
        const block = blocks.find((b: any) => Array.isArray(b.movieKeys) && b.movieKeys.includes(movieKey));
        if (block) return { id: block.id, price: block.price };
    }
    return null;
}

async function getPartyStatus(db: Firestore, blockId: string): Promise<string | undefined> {
    const doc = await db.collection('watch_parties').doc(blockId).get();
    return doc.exists ? doc.data()?.status : undefined;
}
