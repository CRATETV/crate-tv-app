import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showAsRokuParty } from '../api/_lib/rokuParties';

const NOW = Date.parse('2026-11-09T15:00:00Z');
const hrs = (h: number) => new Date(NOW + h * 3600_000).toISOString();
const film = (h: number) => ({ isWatchPartyEnabled: true, watchPartyStartTime: hrs(h) });

test('upcoming party shows', () => {
    assert.equal(showAsRokuParty(film(48), undefined, false, NOW), true);
    assert.equal(showAsRokuParty(film(-2), undefined, false, NOW), true);   // just started
});
test('a party that already ended for this run is not upcoming', () => {
    const ended = { status: 'ended', endedAt: new Date(NOW - 3600_000) };
    assert.equal(showAsRokuParty(film(-2), ended, false, NOW), false);
});
test('rescheduled after it ended counts as a new run', () => {
    const endedEarlier = { status: 'ended', endedAt: new Date(NOW - 5 * 24 * 3600_000) };
    assert.equal(showAsRokuParty(film(48), endedEarlier, false, NOW), true);
});
test('old, too-far-out, switched-off and untimed parties do not show; live always does', () => {
    assert.equal(showAsRokuParty(film(-10), undefined, false, NOW), false);
    assert.equal(showAsRokuParty(film(24 * 40), undefined, false, NOW), false);
    assert.equal(showAsRokuParty({ isWatchPartyEnabled: false, watchPartyStartTime: hrs(5) }, undefined, false, NOW), false);
    assert.equal(showAsRokuParty({ isWatchPartyEnabled: true }, undefined, false, NOW), false);
    assert.equal(showAsRokuParty(film(-10), undefined, true, NOW), true);
});
