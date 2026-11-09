// api/_lib/filmDeleteGuard.ts
//
// The Films editor's trash button (publish-data.ts → delete_movie) used to
// delete a film with no questions asked — even one still listed in a festival
// block or with a watch party about to start. That's how festival night broke:
// films were deleted and added again while the schedule still pointed at the
// old ones. "Remove selected" always had this guard; now the trash button does.
import type { Firestore } from 'firebase-admin/firestore';
import { filmRemovalCheck } from './storageCleanup.js';

export async function deleteGuard(db: Firestore, key: string, nowMs: number): Promise<{ ok: true } | { ok: false; why: string }> {
    const doc = await db.collection('movies').doc(key).get();
    if (!doc.exists) return { ok: true }; // nothing to protect
    const [days, settings] = await Promise.all([
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
    ]);
    const data = {
        movies: { [key]: doc.data() },
        festivalData: days.docs.map(d => d.data()),
        settings: { crateFestConfig: settings.data()?.crateFestConfig },
    };
    // Earnings are skipped on purpose ({}): this is an explicit owner action, and
    // the money record lives on Earnings & payouts either way. Festival blocks,
    // partner films and upcoming/just-held watch parties are what must be protected.
    return filmRemovalCheck(key, data, {}, nowMs);
}
