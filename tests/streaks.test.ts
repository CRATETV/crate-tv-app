// Watch streaks and badges. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    monthKey, currentMonthlyStreak, bestMonthlyStreak, festivalProgress, earnedBadges, nextNudge, festivalIdentity,
} from '../api/_lib/streakRules.js';

test('months are counted in Philadelphia time', () => {
    assert.equal(monthKey(Date.parse('2026-11-01T03:00:00Z')), '2026-10'); // still Oct 31 at 11 PM in Philly
    assert.equal(monthKey(Date.parse('2026-11-01T05:00:00Z')), '2026-11');
});

test('a monthly streak survives the current month until it is skipped', () => {
    const now = Date.parse('2026-10-14T16:00:00Z');
    assert.equal(currentMonthlyStreak(['2026-08', '2026-09', '2026-10'], now), 3);
    assert.equal(currentMonthlyStreak(['2026-08', '2026-09'], now), 2); // October not watched yet: still alive
    assert.equal(currentMonthlyStreak(['2026-07', '2026-08'], now), 0); // September skipped: broken
    assert.equal(currentMonthlyStreak(['2025-12', '2026-01'], Date.parse('2026-01-20T12:00:00Z')), 2); // across the new year
    assert.equal(bestMonthlyStreak(['2026-01', '2026-02', '2026-03', '2026-05', '2026-06']), 3);
    assert.equal(bestMonthlyStreak([]), 0);
});

test('a festival badge needs every block, and badges are never given twice', () => {
    const fest = { id: 'pwff-2027', label: 'PWFF 2027', blocks: [{ id: 'a', title: 'Opening' }, { id: 'b', title: 'Shorts' }, { id: 'c', title: 'Closing' }] };
    const partial = festivalProgress(fest, new Set(['a', 'b']));
    assert.deepEqual([partial.watched, partial.total, partial.complete, partial.remaining], [2, 3, false, ['Closing']]);
    assert.equal(nextNudge([partial]), '1 block left to complete your PWFF 2027 streak: “Closing”.');
    const done = festivalProgress(fest, new Set(['a', 'b', 'c']));
    const first = earnedBadges([], { months: ['2027-08'], festivals: [done] }, '2027-08-22T00:00:00Z');
    assert.deepEqual(first.added.map(b => b.id).sort(), ['festival-pwff-2027', 'first-watch']);
    const again = earnedBadges(first.badges, { months: ['2027-08'], festivals: [done] }, '2027-09-01T00:00:00Z');
    assert.equal(again.added.length, 0);
    assert.equal(again.badges.find(b => b.id === 'first-watch')!.earnedAt, '2027-08-22T00:00:00Z'); // original date kept
    assert.equal(nextNudge([done]), null);
});

test('monthly milestone badges at 3, 6 and 12 months', () => {
    const months = Array.from({ length: 6 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const { added } = earnedBadges([], { months, festivals: [] }, 'x');
    assert.deepEqual(added.map(b => b.id).sort(), ['first-watch', 'months-3', 'months-6']);
});

test('festival names carry their year', () => {
    assert.deepEqual(festivalIdentity('pwff', 'PWFF', Date.parse('2027-08-20T23:00:00Z')), { id: 'pwff-2027', label: 'PWFF 2027' });
    assert.deepEqual(festivalIdentity('partner', 'Philly Shorts', null, 'philly-shorts'), { id: 'p-philly-shorts-tba', label: 'Philly Shorts' });
});
