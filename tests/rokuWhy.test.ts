import test from 'node:test';
import assert from 'node:assert/strict';
import { explainFilm, findFilm } from '../api/_lib/rokuWhy.js';

const base = { festivalDays: [] as any[], nowMs: Date.parse('2026-10-31T12:00:00Z'), inPaidKeys: false, hasVideoAddress: true, videoMissing: false };

test('a plain free film is reported as free', () => {
    const r = explainFilm({ ...base, movie: { key: 'consumed', title: 'Consumed', poster: 'p' } });
    assert.equal(r.roku.lockedForEveryone, false);
    assert.match(r.whyLocked[0], /free on the Roku/);
});
test('for sale, paid watch party, and a leftover festival block each say where to switch them off', () => {
    const days = [{ title: 'Old Day', blocks: [{ title: 'Block A', price: 5, movieKeys: ['consumed'] }, { title: 'Free', price: 0, movieKeys: ['consumed'] }] }];
    const r = explainFilm({ ...base, festivalDays: days, inPaidKeys: true, movie: { key: 'consumed', isForSale: true, isWatchPartyPaid: true, salePrice: 0 } });
    assert.equal(r.roku.inPremierAccessRow, true);
    assert.equal(r.whyLocked.length, 3);
    assert.ok(r.whyLocked.some(x => /FOR SALE/.test(x)));
    assert.ok(r.whyLocked.some(x => /PAID WATCH PARTY/.test(x)));
    assert.ok(r.whyLocked.some(x => /Old Day/.test(x) && /Block A/.test(x) && !/Free/.test(x)));
});
test('a watch party that has not started locks a free film, and says so', () => {
    const r = explainFilm({ ...base, movie: { key: 'c', isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-13T23:00:00Z' } });
    assert.match(r.whyLocked[0], /watch party is switched on/);
});
test('find by key or title', () => {
    const movies = { c1: { key: 'c1', title: 'Consumed' }, t: { key: 't', title: 'A Trip to the Moon' } };
    assert.equal(findFilm(movies, 'c1')?.title, 'Consumed');
    assert.equal(findFilm(movies, 'consumed')?.key, 'c1');
    assert.equal(findFilm(movies, 'trip')?.key, 't');
    assert.equal(findFilm(movies, 'nope'), null);
});
