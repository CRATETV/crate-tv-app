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
// still lacks both a festivalEndTime AND a screeningStartTime), or there
// are no blocks at all.
export async function getFestivalConclusionTime(db: Firestore): Promise<Date | null> {
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    let latestMs: number | null = null;
    let blockCount = 0;

    for (const dayDoc of daysSnap.docs) {
        for (const block of (dayDoc.data().blocks || [])) {
            blockCount++;
            // festivalEndTime only gets stamped by the watch-party-ending
            // code paths — a plain ticketed screening with no live watch
            // party (isWatchPartyEnabled: false) never gets one, and was
            // making the whole festival look permanently "not concluded"
            // for revenue-gating purposes even a week after it genuinely
            // ended (confirmed live: two Saturday blocks with no watch
            // party). screeningStartTime is populated on every block
            // regardless, so it's the fallback reference point — same
            // pattern already used by PwffPage's isBlockExpired and the
            // auto-unlist cron for exactly this reason.
            const referenceTime = block.festivalEndTime || block.screeningStartTime;
            if (!referenceTime) return null;
            const t = new Date(referenceTime).getTime();
            if (isNaN(t)) return null;
            if (latestMs === null || t > latestMs) latestMs = t;
        }
    }

    if (blockCount === 0 || latestMs === null) return null;
    return new Date(latestMs);
}
