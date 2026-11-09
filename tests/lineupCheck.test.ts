import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineupProblems } from '../api/_lib/lineupCheck';

const NOW = Date.parse('2026-11-13T20:00:00Z');
const good = { title: 'Good Film', fullMovie: 'https://b/hsl/good/good.m3u8' };
const days = (blocks: any[]) => [{ day: 1, date: '2026-11-13', blocks }];

test('a lineup where every film is in the catalog and streaming-ready has no problems', () => {
    const d = days([{ id: 'b1', title: 'Block 1', movieKeys: ['good'], watchPartyStartTime: '2026-11-13T23:30:00Z' }]);
    assert.deepEqual(lineupProblems(d, { good }, NOW), []);
});

test('a film that was deleted (or re-added under a new key) is flagged as missing', () => {
    const d = days([{ id: 'b1', title: 'Block 1', movieKeys: ['old-key'] }]);
    const p = lineupProblems(d, { 'new-key': good }, NOW);
    assert.equal(p.length, 1);
    assert.equal(p[0].kind, 'missing');
    assert.match(p[0].text, /no longer in the catalog/);
});

test('no video and unconverted video are flagged', () => {
    const d = days([{ id: 'b1', title: 'B', movieKeys: ['a', 'b'] }]);
    const movies = { a: { title: 'A', fullMovie: '' }, b: { title: 'B', fullMovie: 'https://b/films/b.mov' } };
    assert.deepEqual(lineupProblems(d, movies, NOW).map(p => p.kind), ['no-video', 'unconverted']);
});

test('blocks that already ended, or ran long ago, are ignored', () => {
    const d = days([
        { id: 'b1', title: 'Ended', movieKeys: ['gone'], festivalEndTime: '2026-11-12T02:00:00Z' },
        { id: 'b2', title: 'Old', movieKeys: ['gone'], watchPartyStartTime: '2026-11-01T00:00:00Z' },
    ]);
    assert.deepEqual(lineupProblems(d, {}, NOW), []);
});

test('junk data never throws', () => {
    assert.deepEqual(lineupProblems(undefined as any, undefined as any, NOW), []);
    assert.deepEqual(lineupProblems([{ blocks: [null, { movieKeys: 'x' }] }] as any, {}, NOW), []);
});
