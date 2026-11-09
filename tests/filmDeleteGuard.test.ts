import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filmRemovalCheck } from '../api/_lib/storageCleanup';

// The trash button now runs this same check (api/_lib/filmDeleteGuard.ts).
const NOW = Date.parse('2026-11-13T20:00:00Z');
const base: any = {
    movies: {
        inBlock: { title: 'In Block', isUnlisted: true },
        party: { title: 'Party', isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-14T00:30:00Z' },
        free: { title: 'Free', isUnlisted: true },
    },
    festivalData: [{ day: 1, blocks: [{ movieKeys: ['inBlock'] }] }],
};

test('a film in a festival block cannot be deleted', () => {
    const r: any = filmRemovalCheck('inBlock', base, {}, NOW);
    assert.equal(r.ok, false);
    assert.match(r.why, /festival schedule/);
});

test('a film with an upcoming watch party cannot be deleted', () => {
    assert.equal(filmRemovalCheck('party', base, {}, NOW).ok, false);
});

test('a film nothing uses can be deleted (money check skipped on purpose)', () => {
    assert.equal(filmRemovalCheck('free', base, {}, NOW).ok, true);
});
