// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    shouldAutoStart, blockAccessExpiry, intermissionSecondsFor, runtimeMs, toMillis, UNKNOWN_RUNTIME_MS,
} from '../api/_lib/watchPartyRules.js';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const start = Date.parse('2027-05-14T23:00:00Z');
const ts = (ms: number) => ({ toDate: () => new Date(ms) }); // Firestore Timestamp stand-in

test('does not start before the scheduled time', () => {
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start - MIN }), false);
});

test('starts a never-run party once its time arrives', () => {
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start + MIN }), true);
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start, partyState: { status: 'waiting' } }), true);
});

test('never re-starts a live party', () => {
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start + MIN, partyState: { status: 'live' } }), false);
});

test('REGRESSION: never resurrects a block that already ended (the restart loop)', () => {
    const ended = { status: 'ended', endedAt: ts(start + 95 * MIN) };
    for (const later of [start + 96 * MIN, start + DAY, start + 30 * DAY]) {
        assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: later, partyState: ended }), false);
    }
});

test('legacy ended parties without endedAt use lastUpdated', () => {
    const ended = { status: 'ended', lastUpdated: ts(start + 95 * MIN) };
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start + DAY, partyState: ended }), false);
});

test('ended with no timestamp at all is treated as already run', () => {
    assert.equal(shouldAutoStart({ scheduledStartMs: start, nowMs: start + DAY, partyState: { status: 'ended' } }), false);
});

test('festivalEndTime on the block also blocks a restart', () => {
    assert.equal(shouldAutoStart({
        scheduledStartMs: start, nowMs: start + DAY,
        blockFestivalEndTime: new Date(start + 2 * 60 * MIN).toISOString(),
    }), false);
});

test('a party rescheduled to a NEW time after it ended does start', () => {
    const ended = { status: 'ended', endedAt: ts(start + 95 * MIN) };
    const newStart = start + 7 * DAY;
    assert.equal(shouldAutoStart({ scheduledStartMs: newStart, nowMs: newStart + MIN, partyState: ended }), true);
});

test('REGRESSION: early ticket buyers keep access through the screening + rewatch week', () => {
    const boughtAt = start - 45 * DAY; // early bird, six weeks out
    const exp = blockAccessExpiry({ nowMs: boughtAt, screeningStartTime: new Date(start).toISOString(), rewatchWindowMs: 7 * DAY });
    assert.ok(exp.getTime() > start + 7 * DAY, 'must outlast the rewatch week');
});

test('LOOPHOLE: a ticket bought late in the rewatch week still ends with the festival', () => {
    const now = start + 6 * DAY; // bought on the last day of the rewatch week
    const exp = blockAccessExpiry({ nowMs: now, screeningStartTime: new Date(start).toISOString(), rewatchWindowMs: 7 * DAY });
    assert.equal(exp.getTime(), start + 8 * DAY);
});

test('ticket expiry falls back to 14 days when the block has no start time', () => {
    const exp = blockAccessExpiry({ nowMs: start, screeningStartTime: undefined, rewatchWindowMs: 7 * DAY });
    assert.equal(exp.getTime(), start + 14 * DAY);
});

test('intermissions: 30s normally, one 90s stretch break mid-way through 5+ film blocks', () => {
    assert.deepEqual(intermissionSecondsFor(1, 3), { seconds: 30, isStretchBreak: false });
    assert.deepEqual(intermissionSecondsFor(4, 8), { seconds: 90, isStretchBreak: true });
    assert.deepEqual(intermissionSecondsFor(5, 8), { seconds: 30, isStretchBreak: false });
});

test('runtime falls back to the generous ceiling when missing or zero', () => {
    assert.equal(runtimeMs(12), 12 * MIN);
    assert.equal(runtimeMs(0), UNKNOWN_RUNTIME_MS);
    assert.equal(runtimeMs(undefined), UNKNOWN_RUNTIME_MS);
});

test('toMillis handles every timestamp shape the database returns', () => {
    assert.equal(toMillis(ts(5)), 5);
    assert.equal(toMillis(new Date(7)), 7);
    assert.equal(toMillis('1970-01-01T00:00:00.009Z'), 9);
    assert.equal(toMillis('not a date'), null);
    assert.equal(toMillis(null), null);
});

test('REGRESSION: a party ended earlier but rescheduled later is a NEW run (lobby, not "ended")', async () => {
    const { isEndedForThisRun } = await import('../api/_lib/watchPartyRules.js');
    const endedAt = '2026-10-25T20:00:00Z';
    assert.equal(isEndedForThisRun({ status: 'ended', endedAt }, Date.parse('2026-10-26T20:00:00Z')), false);
    assert.equal(isEndedForThisRun({ status: 'ended', endedAt }, Date.parse('2026-10-25T19:00:00Z')), true);
    assert.equal(isEndedForThisRun({ status: 'ended' }, Date.parse('2026-10-26T20:00:00Z')), true, 'no end time: stay ended (safe)');
    assert.equal(isEndedForThisRun({ status: 'live' }, null), false);
});

import { resetForNewSchedule } from '../api/_lib/watchPartyRules';

test('new future start time: a leftover "ended" goes back to waiting', () => {
    const now = Date.parse('2026-10-26T16:00:00Z');
    assert.equal(resetForNewSchedule({ status: 'ended' }, now + 3600_000, now), true);
});

test('new start time: never touches a live party, a past time, or no party', () => {
    const now = Date.parse('2026-10-26T16:00:00Z');
    assert.equal(resetForNewSchedule({ status: 'live' }, now + 3600_000, now), false);
    assert.equal(resetForNewSchedule({ status: 'ended' }, now - 60_000, now), false);
    assert.equal(resetForNewSchedule(undefined, now + 3600_000, now), false);
    assert.equal(resetForNewSchedule({ status: 'ended' }, NaN, now), false);
});
