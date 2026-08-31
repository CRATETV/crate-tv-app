import { Firestore } from 'firebase-admin/firestore';

export interface EntitlementCheck {
    uid?: string;
    deviceId?: string;
    movieKey?: string;
    blockId?: string;
}

/**
 * Resolves whether a given user (by uid) has real access to a movie/block, checking
 * (in order): festival all-access pass, unlocked festival block, direct movie rental,
 * a festival ticket doc for the block, and finally whether the block itself is free.
 *
 * Extracted from api/get-stream-url.ts so web and Roku share one audited implementation
 * instead of each keeping their own copy of "is this actually unlocked."
 */
export async function checkEntitlement(db: Firestore, { uid, movieKey, blockId }: EntitlementCheck): Promise<boolean> {
    if (!uid) return false;
    const userData = (await db.collection('users').doc(uid).get()).data() || {};
    return checkEntitlementFromUserData(db, userData, { uid, movieKey, blockId });
}

/**
 * Same checks as checkEntitlement, but resolves the user via a Roku deviceId ->
 * roku_links -> userId lookup instead of a Firebase uid. Reuses the exact
 * deviceId resolution already proven correct in api/roku-feed.ts.
 */
export async function checkEntitlementByDeviceId(db: Firestore, { deviceId, movieKey, blockId }: EntitlementCheck): Promise<boolean> {
    if (!deviceId) return false;
    const linkDoc = await db.collection('roku_links').doc(deviceId).get();
    if (!linkDoc.exists) return false;
    const userId = linkDoc.data()?.userId;
    if (!userId) return false;
    const userData = (await db.collection('users').doc(userId).get()).data() || {};
    return checkEntitlementFromUserData(db, userData, { uid: userId, movieKey, blockId });
}

async function checkEntitlementFromUserData(db: Firestore, userData: FirebaseFirestore.DocumentData, { uid, movieKey, blockId }: EntitlementCheck): Promise<boolean> {
    const now = new Date();

    if (userData.hasFestivalAllAccess) return true;

    if (blockId) {
        const exp = (userData.unlockedBlocks || {})[blockId];
        if (exp && new Date(exp) > now) return true;
    }

    if (movieKey) {
        const rental = (userData.rentals || {})[movieKey];
        if (rental && new Date(rental) > now) return true;
    }

    if (blockId && uid) {
        const snap = await db.collection('festival_tickets').where('uid', '==', uid).where('itemId', '==', blockId).limit(1).get();
        if (!snap.empty) return true;
    }

    if (blockId) {
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        for (const d of daysSnap.docs) {
            const block = d.data().blocks?.find((b: any) => b.id === blockId);
            if (block && (!block.price || block.price === 0)) return true;
        }
    }

    return false;
}
