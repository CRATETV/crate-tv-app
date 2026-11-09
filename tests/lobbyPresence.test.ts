import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLobbyViewerActive, clockSkewMs, LOBBY_STALE_MS } from '../api/_lib/lobbyPresence';

const NOW = Date.parse('2026-11-13T23:00:00Z');
const at = (msAgo: number) => ({ toMillis: () => NOW - msAgo });

test('someone who checked in recently is here', () => {
    assert.equal(isLobbyViewerActive({ lastSeen: at(10_000) }, NOW), true);
    assert.equal(isLobbyViewerActive({ lastSeen: at(LOBBY_STALE_MS) }, NOW), true);
});

test('a ghost (no check-in for over 3 minutes) is not counted', () => {
    assert.equal(isLobbyViewerActive({ lastSeen: at(LOBBY_STALE_MS + 1000) }, NOW), false);
    assert.equal(isLobbyViewerActive({ lastSeen: { seconds: (NOW - 10 * 60_000) / 1000 } }, NOW), false);
});

test('a doc whose server time has not landed yet counts, and so does a pre-heartbeat doc', () => {
    assert.equal(isLobbyViewerActive({ lastSeen: null }, NOW), true);
    assert.equal(isLobbyViewerActive({}, NOW), true);
});

test('junk never throws', () => {
    assert.equal(isLobbyViewerActive(undefined, NOW), true);
    assert.equal(isLobbyViewerActive({ lastSeen: 'x' }, NOW), true);
});

test('a person who stepped away for two minutes is still counted', () => {
    assert.equal(isLobbyViewerActive({ lastSeen: at(120_000) }, NOW), true);
});

test('a phone with a fast clock does not see everyone as a ghost', () => {
    const fastPhoneNow = NOW + 5 * 60_000;                 // phone clock 5 minutes ahead
    const ownCheckIn = at(1_000);                           // server stamped us 1s ago (server time)
    const skew = clockSkewMs(ownCheckIn, fastPhoneNow);
    assert.equal(isLobbyViewerActive({ lastSeen: at(20_000) }, fastPhoneNow), false);       // without the fix
    assert.equal(isLobbyViewerActive({ lastSeen: at(20_000) }, fastPhoneNow + skew), true);  // with it
});

test('clock skew is capped and safe on junk', () => {
    assert.equal(clockSkewMs(null, NOW), 0);
    assert.equal(clockSkewMs(at(0), NOW - 3 * 3600_000), 600_000);
});
