import { Firestore } from 'firebase-admin/firestore';

// While the festival is running, individual VOD rental revenue for a
// festival film goes to Crate/Playhouse West (via the separate
// process-festival-payout.ts flow for passes/blocks — rentals aren't
// currently attributed anywhere during this window, so they're just
// Crate's). Only once the WHOLE multi-day festival has concluded — every
// block across every day has ended, not just that film's own block —
// does an individual rental start counting toward the filmmaker. Tips
// are the one explicit exception: they count immediately regardless.
//
// Returns null if the festival hasn't fully concluded yet (any block
// still lacks a festivalEndTime), or there are no blocks at all.
export async function getFestivalConclusionTime(db: Firestore): Promise<Date | null> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    let latestMs: number | null = null;
    let blockCount = 0;

    for (const dayDoc of daysSnap.docs) {
        for (const block of (dayDoc.data().blocks || [])) {
            blockCount++;
            if (!block.festivalEndTime) return null;
            const t = new Date(block.festivalEndTime).getTime();
            if (isNaN(t)) return null;
            if (latestMs === null || t > latestMs) latestMs = t;
        }
    }

    if (blockCount === 0 || latestMs === null) return null;
    return new Date(latestMs);
}
