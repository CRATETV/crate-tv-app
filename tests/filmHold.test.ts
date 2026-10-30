import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filmHoldReason } from '../api/_lib/filmAvailability';

const now = Date.parse('2026-11-13T22:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const hour = 3_600_000;

test('a film with a future release date is held; once released it is not', () => {
    assert.equal(filmHoldReason({ releaseDateTime: iso(now + hour) }, now), 'not-released');
    assert.equal(filmHoldReason({ releaseDateTime: iso(now - hour) }, now), null);
    assert.equal(filmHoldReason({}, now), null);
});

test('a premiere is held until 15 seconds before its start, then open', () => {
    const m = { isWatchPartyEnabled: true, watchPartyStartTime: iso(now + hour) };
    assert.equal(filmHoldReason(m, now), 'party-waiting');
    assert.equal(filmHoldReason({ ...m, watchPartyStartTime: iso(now + 10_000) }, now), null);
    assert.equal(filmHoldReason({ ...m, watchPartyStartTime: iso(now - hour) }, now), null);
});

test('a party switched off (it ended) no longer holds the film', () => {
    assert.equal(filmHoldReason({ isWatchPartyEnabled: false, watchPartyStartTime: iso(now + hour) }, now), null);
});

test('a party with no start time: held in public feeds, not for a ticket holder', () => {
    const m = { isWatchPartyEnabled: true };
    assert.equal(filmHoldReason(m, now, { publicFeed: true }), 'party-waiting');
    assert.equal(filmHoldReason(m, now), null);
});

test('a film past "hide automatically after" is gone', () => {
    assert.equal(filmHoldReason({ availableUntil: iso(now - 1000) }, now), 'gone');
    assert.equal(filmHoldReason({ availableUntil: iso(now + hour) }, now), null);
});

test('nothing known about the film means nothing held', () => {
    assert.equal(filmHoldReason(undefined, now), null);
    assert.equal(filmHoldReason(null, now), null);
});

import { readFileSync } from 'node:fs';
test('every public side door uses the same hold rule', () => {
    for (const f of ['api/roku-feed.ts', 'api/roku-movie-details.ts', 'api/instant-tv-feed.ts', 'api/roku-direct-publisher-feed.ts']) {
        assert.ok(readFileSync(f, 'utf8').includes('filmHoldReason('), `${f} must hold unreleased films`);
    }
    assert.ok(readFileSync('api/get-stream-url.ts', 'utf8').includes('releaseDateTime'), 'the film page checks the release date on the server');
});
