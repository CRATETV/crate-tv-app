import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPastAvailableUntil, isJustPremiered } from '../api/_lib/filmAvailability';

const H = 3600_000;
const premiere = Date.parse('2026-11-13T00:00:00Z'); // Fri Nov 13, 7pm ET
const film = { isWatchPartyEnabled: true, watchPartyStartTime: new Date(premiere).toISOString(), durationInMinutes: 90, availableUntil: '2026-11-16T04:59:00Z' };

test('no date set: never hidden', () => {
    assert.equal(isPastAvailableUntil({}, Date.now()), false);
    assert.equal(isPastAvailableUntil({ availableUntil: '' }, Date.now()), false);
    assert.equal(isPastAvailableUntil({ availableUntil: 'not a date' }, Date.now()), false);
    assert.equal(isPastAvailableUntil(null, Date.now()), false);
});

test('hidden from the moment the date passes', () => {
    const until = Date.parse(film.availableUntil);
    assert.equal(isPastAvailableUntil(film, until - 1), false);
    assert.equal(isPastAvailableUntil(film, until), true);
});

test('just premiered: not before or during the premiere', () => {
    assert.equal(isJustPremiered(film, undefined, premiere - H), false);
    assert.equal(isJustPremiered(film, 'live', premiere + H), false);
    assert.equal(isJustPremiered(film, undefined, premiere + H), false); // 90 min film still playing
});

test('just premiered: right after it ends, through the weekend', () => {
    assert.equal(isJustPremiered(film, 'ended', premiere + 2 * H), true);
    assert.equal(isJustPremiered(film, undefined, premiere + 3 * H), true); // over by the clock
    assert.equal(isJustPremiered(film, 'ended', premiere + 48 * H), true);
});

test('just premiered: gone once past its hide time, its party is switched off, or a week later', () => {
    assert.equal(isJustPremiered(film, 'ended', Date.parse(film.availableUntil)), false);
    assert.equal(isJustPremiered({ ...film, isWatchPartyEnabled: false }, 'ended', premiere + 5 * H), false);
    // Kept hidden from the catalog until the premiere: still shows its weekend.
    assert.equal(isJustPremiered({ ...film, isUnlisted: true }, 'ended', premiere + 5 * H), true);
    assert.equal(isJustPremiered({ ...film, partnerId: 'pwff' } as any, 'ended', premiere + 5 * H), false);
    const noEnd = { ...film, availableUntil: undefined };
    assert.equal(isJustPremiered(noEnd, 'ended', premiere + 6 * 24 * H), true);
    assert.equal(isJustPremiered(noEnd, 'ended', premiere + 8 * 24 * H), false);
});

test('just premiered: needs a watch party with a start time', () => {
    assert.equal(isJustPremiered({ ...film, isWatchPartyEnabled: false }, 'ended', premiere + 5 * H), false);
    assert.equal(isJustPremiered({ ...film, watchPartyStartTime: '' }, 'ended', premiere + 5 * H), false);
});

test('just premiered: still shows after the party ended and was switched off', () => {
    const after = { ...film, isWatchPartyEnabled: false, watchPartyStartTime: null as any, lastPremiereAt: film.watchPartyStartTime };
    assert.equal(isJustPremiered(after, undefined, premiere + 5 * H), true);
    assert.equal(isJustPremiered(after, undefined, Date.parse(film.availableUntil)), false);
    assert.equal(isJustPremiered({ ...after, lastPremiereAt: undefined }, undefined, premiere + 5 * H), false);
});
