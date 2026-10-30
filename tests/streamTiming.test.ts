import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveStreamGate, STREAM_EARLY_MS } from '../api/_lib/streamTiming';

const now = Date.parse('2026-11-13T23:00:00Z');
const min = 60_000;

test('before the start the video is not handed out, and the viewer is told when to ask again', () => {
    const g = liveStreamGate({ partyState: { status: 'waiting' }, scheduledStartMs: now + 10 * min, nowMs: now });
    assert.equal(g.open, false);
    if (!g.open) assert.equal(g.retryAfterSeconds, 30);
});

test('it opens 15 seconds before the start, not earlier', () => {
    assert.equal(liveStreamGate({ partyState: undefined, scheduledStartMs: now + STREAM_EARLY_MS + 1000, nowMs: now }).open, false);
    assert.equal(liveStreamGate({ partyState: undefined, scheduledStartMs: now + STREAM_EARLY_MS - 1000, nowMs: now }).open, true);
    assert.equal(liveStreamGate({ partyState: undefined, scheduledStartMs: now - 5 * min, nowMs: now }).open, true);
});

test('a party an admin started by hand is open', () => {
    const g = liveStreamGate({ partyState: { status: 'live', lastStartedAt: now - min, actualStartTime: now - min }, scheduledStartMs: now + 30 * min, nowMs: now });
    assert.equal(g.open, true);
});

test('no start time and not started: closed, check again soon', () => {
    const g = liveStreamGate({ partyState: undefined, scheduledStartMs: null, nowMs: now });
    assert.equal(g.open, false);
    if (!g.open) assert.equal(g.retryAfterSeconds, 8);
});

test('a leftover "live" or "ended" from an earlier run does not open a new screening', () => {
    const start = now + 2 * min;
    assert.equal(liveStreamGate({ partyState: { status: 'live', actualStartTime: now - 5 * 24 * 60 * min }, scheduledStartMs: start + 60 * min, nowMs: now }).open, false);
    assert.equal(liveStreamGate({ partyState: { status: 'ended', endedAt: now - 5 * 24 * 60 * min }, scheduledStartMs: start, nowMs: now }).open, false);
});

test('the retry wait is short when the start is close', () => {
    const g = liveStreamGate({ partyState: undefined, scheduledStartMs: now + STREAM_EARLY_MS + 5000, nowMs: now });
    assert.equal(g.open, false);
    if (!g.open) assert.equal(g.retryAfterSeconds, 6);
});
