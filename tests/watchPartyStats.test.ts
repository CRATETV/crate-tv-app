import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWatchPartyStats } from '../api/_lib/watchPartyStats';

const ts = (ms: number) => ({ toMillis: () => ms });

function fakeDb(sessions: any[]) {
    return {
        collection: () => ({
            where: () => ({
                get: async () => ({ forEach: (fn: (d: any) => void) => sessions.forEach(s => fn({ data: () => s })) }),
            }),
        }),
    } as any;
}

test('viewer numbers add up, including who is watching right now', async () => {
    const now = Date.now();
    const stats = await computeWatchPartyStats(fakeDb([
        // still watching: heartbeat 10 seconds ago
        { userId: 'a', watchSeconds: 600, device: 'mobile', startedAt: ts(now - 600_000), lastHeartbeat: ts(now - 10_000) },
        // left cleanly earlier
        { userId: 'b', watchSeconds: 300, device: 'desktop', startedAt: ts(now - 900_000), lastHeartbeat: ts(now - 600_000), endedAt: ts(now - 600_000) },
        // quick bounce, connection dropped long ago
        { userId: 'c', watchSeconds: 60, device: 'desktop', startedAt: ts(now - 2_000_000), lastHeartbeat: ts(now - 1_940_000) },
    ]), 'block-1');
    assert.equal(stats.uniqueViewers, 3);
    assert.equal(stats.totalWatchMinutes, 16);
    assert.equal(stats.watchingNow, 1);
    assert.equal(stats.sessionsUnder2Min, 1);
    assert.equal(stats.peakConcurrentViewers, 2);
    assert.deepEqual(stats.peakDeviceSplit, { mobile: 1, desktop: 2 });
});
