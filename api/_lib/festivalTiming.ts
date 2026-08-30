import { Firestore } from 'firebase-admin/firestore';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../../types.js';

// While the festival is running — which, for revenue purposes, includes
// the full on-demand rewatch week after the live screenings end, not
// just the live weekend itself — individual VOD rental revenue for a
// festival film goes to Crate/Playhouse West (via the separate
// process-festival-payout.ts flow for passes/blocks — rentals aren't
// currently attributed anywhere during this window, so they're just
// Crate's). Only once that ENTIRE window has closed — every block across
// every day has ended, AND the 7-day rewatch window past the last one
// has elapsed — does an individual rental start counting toward the
// filmmaker. Tips are the one explicit exception: they count immediately
// regardless. Confirmed explicitly: "its after the additional week that
// the money starts going to filmmakers."
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
    // The last block's own end time is only when the LIVE screening
    // ended — filmmaker eligibility doesn't start until the rewatch
    // week built on top of that has also fully elapsed.
    return new Date(latestMs + FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);
}
