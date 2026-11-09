import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSchedule } from '../api/_lib/scheduleList.js';

const NOW = Date.parse('2026-11-08T12:00:00Z');
const h = (n: number) => new Date(NOW + n * 3600_000).toISOString();

test('upcoming = switched on or starting soon; rest is hidden behind the arrow', () => {
    const items = [
        { title: 'Old Block', watchPartyStartTime: h(-24 * 80) },            // months ago, off
        { title: 'Neighbors' },                                               // never scheduled
        { title: 'Friday Premiere', isWatchPartyEnabled: true, watchPartyStartTime: h(100) },
        { title: 'Tonight', isWatchPartyEnabled: true, watchPartyStartTime: h(-2) },
        { title: 'Planned', watchPartyStartTime: h(30) },                     // future but not switched on yet
    ];
    const { upcoming, rest } = splitSchedule(items, NOW);
    assert.deepEqual(upcoming.map(i => i.title), ['Tonight', 'Planned', 'Friday Premiere']);
    assert.deepEqual(rest.map(i => i.title), ['Neighbors', 'Old Block']);
});

test('a switched-on film is never hidden, even with a stale or missing time', () => {
    const { upcoming, rest } = splitSchedule([
        { title: 'A', isWatchPartyEnabled: true, watchPartyStartTime: h(-24 * 60) },
        { title: 'B', isWatchPartyEnabled: true },
    ], NOW);
    assert.equal(rest.length, 0);
    assert.deepEqual(upcoming.map(i => i.title), ['A', 'B']);
});

test('a party that started 13 hours ago and is off goes to the rest; 11 hours ago stays', () => {
    const { upcoming, rest } = splitSchedule([
        { title: 'Recent', watchPartyStartTime: h(-11) },
        { title: 'Past', watchPartyStartTime: h(-13) },
    ], NOW);
    assert.deepEqual(upcoming.map(i => i.title), ['Recent']);
    assert.deepEqual(rest.map(i => i.title), ['Past']);
});

test('a garbage start time does not crash and counts as not scheduled', () => {
    const { upcoming, rest } = splitSchedule([{ title: 'X', watchPartyStartTime: 'nope' }], NOW);
    assert.equal(upcoming.length, 0);
    assert.equal(rest.length, 1);
});
