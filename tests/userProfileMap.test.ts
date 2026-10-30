import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { userFromDoc } from '../services/userProfileMap';

test('REGRESSION: a watch party ticket stays on the account after a reload or on another device', () => {
    const u = userFromDoc('u1', { email: 'a@b.com', unlockedWatchPartyKeys: ['you-dont-know-my-name', 5, null] });
    assert.deepEqual(u.unlockedWatchPartyKeys, ['you-dont-know-my-name']);
    assert.deepEqual(userFromDoc('u1', {}).unlockedWatchPartyKeys, []);
});

test('every access the server grants is carried over: passes, blocks, rentals', () => {
    const future = '2026-12-01T00:00:00Z';
    const u = userFromDoc('u1', {
        hasFestivalAllAccess: true, festivalPassExpiry: future,
        hasCrateFestPass: true, crateFestPassExpiry: future, hasJuryPass: true,
        unlockedBlocks: { b1: future }, unlockedBlockIds: ['b2'], purchasedMovieKeys: ['m1'], rentals: { m2: future },
    });
    assert.equal(u.hasFestivalAllAccess, true);
    assert.equal(u.festivalPassExpiry, future);
    assert.equal(u.hasCrateFestPass, true);
    assert.equal(u.crateFestPassExpiry, future);
    assert.equal(u.hasJuryPass, true);
    assert.deepEqual(u.unlockedBlocks, { b1: future });
    assert.deepEqual(u.unlockedBlockIds, ['b2']);
    assert.deepEqual(u.purchasedMovieKeys, ['m1']);
    assert.deepEqual(u.rentals, { m2: future });
});

test('junk and missing values fall back safely', () => {
    const u = userFromDoc('u1', { email: 'sam@x.com', watchlist: 'nope', unlockedBlocks: 7 });
    assert.equal(u.name, 'sam');
    assert.deepEqual(u.watchlist, []);
    assert.deepEqual(u.unlockedBlocks, {});
    assert.equal(u.hasJuryPass, false);
});

test('the app reads the profile through the shared mapping', () => {
    assert.ok(readFileSync('services/firebaseClient.ts', 'utf8').includes('userFromDoc(uid, data)'));
});
