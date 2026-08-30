// Admin-SDK counterpart to services/watchPartyAdminStats.ts (which uses the
// client compat SDK) — same watchSessions data, same derived numbers, just
// callable from server code (the post-party report email). Keep the two in
// sync if the definition of any stat changes.

import { Firestore } from 'firebase-admin/firestore';

export interface WatchPartyStats {
    uniqueViewers: number;
    totalWatchMinutes: number;
    averageWatchMinutes: number;
    peakConcurrentViewers: number;
    peakDeviceSplit: { mobile: number; desktop: number };
    sessionsUnder2Min: number;
}

export async function computeWatchPartyStats(db: Firestore, blockId: string): Promise<WatchPartyStats> {
    const snapshot = await db.collection('watchSessions').where('blockId', '==', blockId).get();

    const seenUsers = new Set<string>();
    let totalSeconds = 0;
    let mobileCount = 0;
    let desktopCount = 0;
    let bounces = 0;
    // Sweep-line peak concurrency: +1 at each session's start, -1 at its
    // effective end (endedAt if it left cleanly, otherwise its last
    // heartbeat — covers a dropped connection that never fired the
    // unmount cleanup). Sorting ties with starts (+1) before ends (-1) so
    // a session ending the instant another begins still counts as overlap.
    const events: { time: number; delta: number }[] = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        seenUsers.add(data.userId);
        totalSeconds += data.watchSeconds || 0;

        if (data.device === 'mobile') mobileCount++;
        else desktopCount++;

        if ((data.watchSeconds || 0) < 120) bounces++;

        const startMs = data.startedAt?.toMillis?.();
        const endMs = (data.endedAt || data.lastHeartbeat)?.toMillis?.();
        if (startMs && endMs && endMs >= startMs) {
            events.push({ time: startMs, delta: 1 });
            events.push({ time: endMs, delta: -1 });
        }
    });

    events.sort((a, b) => a.time - b.time || b.delta - a.delta);
    let current = 0;
    let peakConcurrentViewers = 0;
    for (const e of events) {
        current += e.delta;
        if (current > peakConcurrentViewers) peakConcurrentViewers = current;
    }

    const uniqueViewers = seenUsers.size;
    const totalWatchMinutes = Math.round(totalSeconds / 60);
    const averageWatchMinutes = uniqueViewers > 0 ? Math.round(totalWatchMinutes / uniqueViewers) : 0;

    return {
        uniqueViewers,
        totalWatchMinutes,
        averageWatchMinutes,
        peakConcurrentViewers,
        peakDeviceSplit: { mobile: mobileCount, desktop: desktopCount },
        sessionsUnder2Min: bounces,
    };
}
