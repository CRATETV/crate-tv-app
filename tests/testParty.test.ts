import test from 'node:test';
import assert from 'node:assert/strict';
import { testPartyResetDue, TEST_PARTY_RESET } from '../api/_lib/testParty.js';

const now = Date.parse('2026-10-31T12:00:00Z');
const start = '2026-10-31T09:00:00Z';

test('a test party that has ended resets the film', () => {
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: start }, { status: 'ended', endedAt: { toMillis: () => Date.parse('2026-10-31T10:30:00Z') } }, now), true);
});
test('a real (not marked as test) party is never touched, ended or not', () => {
    assert.equal(testPartyResetDue({ watchPartyStartTime: start, isWatchPartyPaid: true }, { status: 'ended', endedAt: { toMillis: () => now } }, now), false);
    assert.equal(testPartyResetDue({ isTestParty: false, watchPartyStartTime: start }, { status: 'ended', endedAt: { toMillis: () => now } }, now), false);
});
test('a live test party is left alone; one coming up is left alone', () => {
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: start }, { status: 'live' }, now), false);
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: '2026-11-13T23:00:00Z' }, undefined, now), false);
});
test('an "ended" left over from an EARLIER run does not reset a new test party', () => {
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: '2026-11-13T23:00:00Z' }, { status: 'ended', endedAt: { toMillis: () => Date.parse('2026-10-20T00:00:00Z') } }, now), false);
});
test('a test party that never ran is cleaned up 6 hours after its time', () => {
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: '2026-10-31T05:00:00Z' }, undefined, now), true);
    assert.equal(testPartyResetDue({ isTestParty: true, watchPartyStartTime: '2026-10-31T08:00:00Z' }, undefined, now), false);
});
test('the reset switches off exactly the party and the paid ticket, and clears the test mark', () => {
    assert.deepEqual({ ...TEST_PARTY_RESET }, { isWatchPartyEnabled: false, isWatchPartyPaid: false, watchPartyStartTime: '', isTestParty: false });
});
