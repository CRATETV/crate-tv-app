import test from 'node:test';
import assert from 'node:assert/strict';
import { binOf, isFinished, sumShards, summarizeWatch } from '../api/_lib/watchStats.js';

test('binOf: tenths of the film', () => {
    assert.equal(binOf(0, 100), 0);
    assert.equal(binOf(9.9, 100), 0);
    assert.equal(binOf(10, 100), 1);
    assert.equal(binOf(99.9, 100), 9);
    assert.equal(binOf(150, 100), 9);
    assert.equal(binOf(5, 0), -1);
    assert.equal(binOf(NaN, 100), -1);
    assert.equal(binOf(-1, 100), -1);
});

test('isFinished at 95%', () => {
    assert.equal(isFinished(94, 100), false);
    assert.equal(isFinished(95, 100), true);
    assert.equal(isFinished(5, 0), false);
});

test('sumShards adds every shard and ignores junk', () => {
    const c = sumShards([{ starts: 3, d0: 3, d1: 2, fin: 1 }, undefined, { starts: 2, d0: 2, d1: 'x', d9: 1, fin: 1 }, { starts: -4 }]);
    assert.equal(c.starts, 5);
    assert.equal(c.fin, 2);
    assert.deepEqual(c.bins, [5, 2, 0, 0, 0, 0, 0, 0, 0, 1]);
});

test('summarizeWatch: finish rate and biggest drop', () => {
    const s = summarizeWatch({ starts: 20, bins: [20, 18, 10, 9, 9, 8, 8, 7, 7, 6], fin: 5 });
    assert.equal(s.plays, 20);
    assert.equal(s.finishRate, 0.25);
    assert.equal(s.enough, true);
    assert.deepEqual(s.biggestDrop && { f: s.biggestDrop.fromPct, t: s.biggestDrop.toPct }, { f: 20, t: 30 });
    assert.equal(s.stillWatching[0], 1);
});

test('summarizeWatch: nobody yet', () => {
    const s = summarizeWatch({ starts: 0, bins: Array(10).fill(0), fin: 0 });
    assert.equal(s.finishRate, null);
    assert.equal(s.biggestDrop, null);
    assert.equal(s.enough, false);
});

test('summarizeWatch never goes above 100%', () => {
    const s = summarizeWatch({ starts: 2, bins: Array(10).fill(5), fin: 9 });
    assert.equal(s.finishRate, 1);
    assert.ok(s.stillWatching.every(x => x <= 1));
});
