import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFestivalPassActive, festivalPassExpiryFor, laterExpiry, partnerPassIsCurrent, PASS_FALLBACK_MS } from '../api/_lib/festivalPass.js';

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const now = Date.parse('2027-08-01T12:00:00Z');

test('an old forever pass (no end date) no longer works', () => {
    assert.equal(isFestivalPassActive({ hasFestivalAllAccess: true }, now), false);
});

test('a pass works until its end date, then stops', () => {
    const u = { hasFestivalAllAccess: true, festivalPassExpiry: '2027-08-31T00:00:00Z' };
    assert.equal(isFestivalPassActive(u, now), true);
    assert.equal(isFestivalPassActive(u, Date.parse('2027-09-01T00:00:00Z')), false);
});

test('a 2026 pass does not open the 2027 festival', () => {
    assert.equal(isFestivalPassActive({ hasFestivalAllAccess: true, festivalPassExpiry: '2026-08-31T23:00:00Z' }, now), false);
});

test('a new pass ends one rewatch week (+1 day) after the last block', () => {
    const blocks = [
        { screeningStartTime: '2027-08-20T23:00:00Z' },
        { screeningStartTime: '2027-08-22T23:00:00Z' },
        { screeningStartTime: '2027-08-21T23:00:00Z' },
    ];
    assert.equal(festivalPassExpiryFor(blocks, WEEK, now), new Date(Date.parse('2027-08-22T23:00:00Z') + WEEK + DAY).toISOString());
});

test('the real end time of a block wins over its start time', () => {
    const blocks = [{ screeningStartTime: '2027-08-22T23:00:00Z', festivalEndTime: '2027-08-23T02:00:00Z' }];
    assert.equal(festivalPassExpiryFor(blocks, WEEK, now), new Date(Date.parse('2027-08-23T02:00:00Z') + WEEK + DAY).toISOString());
});

test('no schedule yet: falls back to a fixed window', () => {
    assert.equal(festivalPassExpiryFor([], WEEK, now), new Date(now + PASS_FALLBACK_MS).toISOString());
});

test('re-granting never shortens a pass', () => {
    assert.equal(laterExpiry('2027-09-10T00:00:00.000Z', '2027-09-01T00:00:00.000Z'), '2027-09-10T00:00:00.000Z');
    assert.equal(laterExpiry('2026-08-31T00:00:00.000Z', '2027-09-01T00:00:00.000Z'), '2027-09-01T00:00:00.000Z');
    assert.equal(laterExpiry(undefined, '2027-09-01T00:00:00.000Z'), '2027-09-01T00:00:00.000Z');
});

test('a partner pass from last year does not carry into this year', () => {
    const cleanedUp = Date.parse('2026-09-01T00:00:00Z');
    assert.equal(partnerPassIsCurrent(Date.parse('2026-08-10T00:00:00Z'), cleanedUp), false);
    assert.equal(partnerPassIsCurrent(Date.parse('2027-07-10T00:00:00Z'), cleanedUp), true);
    assert.equal(partnerPassIsCurrent(Date.parse('2026-08-10T00:00:00Z'), null), true);
});
