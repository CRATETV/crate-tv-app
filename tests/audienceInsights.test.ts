import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audienceInsights } from '../api/_lib/audienceInsights.js';
import { normalizeSource, cleanTag } from '../api/_lib/trafficSource.js';

const NOW = Date.parse('2026-11-20T15:00:00Z');
const day = (n: number) => NOW - n * 86_400_000;

test('normalizes where visitors came from', () => {
    assert.equal(normalizeSource('https://l.instagram.com/?u=x'), 'instagram');
    assert.equal(normalizeSource('https://m.facebook.com/'), 'facebook');
    assert.equal(normalizeSource('https://www.google.com/search?q=crate'), 'google');
    assert.equal(normalizeSource('https://t.co/abc'), 'x');
    assert.equal(normalizeSource('https://www.some-blog.org/post'), 'some-blog.org');
    assert.equal(normalizeSource(''), 'direct');
    assert.equal(normalizeSource(undefined), 'direct');
});

test('our own pages are not a source; link tags win and are cleaned', () => {
    assert.equal(normalizeSource('https://cratetv.net/movie/x'), 'direct');
    assert.equal(normalizeSource('https://crate-tv-app.vercel.app/'), 'direct');
    assert.equal(normalizeSource('IG Story!!'), 'ig-story');
    assert.equal(cleanTag('  Cast & Crew  '), 'cast-crew');
    assert.equal(normalizeSource('<script>'), 'script');
});

test('counts visits by source, biggest first, with percentages', () => {
    const ev = [
        ...Array.from({ length: 6 }, () => ({ type: 'VISIT', source: 'instagram', tsMs: day(1) })),
        ...Array.from({ length: 3 }, () => ({ type: 'VISIT', source: 'direct', tsMs: day(1) })),
        { type: 'VISIT', source: 'google', tsMs: day(2) },
        { type: 'VISIT', tsMs: day(2) },                      // before tracking: ignored
    ];
    const r = audienceInsights(ev, NOW);
    assert.deepEqual(r.sources.map(s => [s.source, s.count, s.pct]), [['instagram', 6, 60], ['direct', 3, 30], ['google', 1, 10]]);
    assert.equal(r.visitsWithSource, 10);
});

test('returning viewers = signed-in people who watched on 2+ different days', () => {
    const ev = [
        { type: 'VIEW', uid: 'a', source: 'direct', tsMs: day(5) },
        { type: 'VIEW', uid: 'a', source: 'direct', tsMs: day(1) },   // back on another day
        { type: 'VIEW', uid: 'b', source: 'direct', tsMs: day(1) },
        { type: 'VIEW', uid: 'b', source: 'direct', tsMs: day(1) + 3600_000 }, // same day twice: not returning
        { type: 'VIEW', uid: 'c', source: 'direct', tsMs: day(3) },
        { type: 'VIEW', source: 'direct', tsMs: day(3) },              // no account: not counted as a person
    ];
    const r = audienceInsights(ev, NOW);
    assert.deepEqual([r.viewers, r.returning, r.returningPct], [3, 1, 33]);
});

test('ignores events older than the window and reports days of data', () => {
    const r = audienceInsights([
        { type: 'VISIT', source: 'direct', tsMs: day(60) },
        { type: 'VISIT', source: 'direct', tsMs: day(4) },
        { type: 'VISIT', source: 'direct', tsMs: null },
    ], NOW);
    assert.equal(r.visitsWithSource, 1);
    assert.equal(r.daysOfData, 4);
});

test('no data gives zeros, never NaN', () => {
    assert.deepEqual(audienceInsights([], NOW), { sources: [], visitsWithSource: 0, viewers: 0, returning: 0, returningPct: 0, daysOfData: 0 });
});
