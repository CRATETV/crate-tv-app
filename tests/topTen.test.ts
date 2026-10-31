import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topTen, rankByViews } from '../api/_lib/topTen';

const NOW = Date.parse('2026-10-30T20:00:00Z');
const f = (key: string, extra: any = {}) => ({ key, title: key.toUpperCase(), poster: 'p.jpg', ...extra });
const films = [
    f('a'), f('b'), f('c', { publishedAt: '2026-10-01T00:00:00Z' }), f('d', { isUnlisted: true }), f('e', { poster: '' }),
    f('g', { releaseDateTime: '2026-12-01T00:00:00Z' }), f('h', { availableUntil: '2026-10-01T00:00:00Z' }), f('i'),
];
const counts = { a: 5, b: 9, d: 99, g: 99, h: 99, i: 5 };

test('same filters everywhere: no unlisted, no poster-less, no unreleased, no expired', () => {
    assert.deepEqual(topTen(films, counts, NOW).map(m => m.key), ['b', 'a', 'i', 'c']);
});
test('order never depends on the order the data arrives in (ties are broken the same way)', () => {
    const forward = rankByViews(films, counts, NOW).map(m => m.key);
    const backward = rankByViews([...films].reverse(), counts, NOW).map(m => m.key);
    assert.deepEqual(forward, backward);
});
test('limit and empty input', () => {
    assert.equal(topTen(films, counts, NOW, 2).length, 2);
    assert.deepEqual(topTen([], undefined, NOW), []);
    assert.deepEqual(topTen([undefined, null, f('z')], undefined, NOW).map(m => m.key), ['z']);
});
