import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLobbyViewerActive, LOBBY_STALE_MS } from '../api/_lib/lobbyPresence';

const NOW = Date.parse('2026-11-13T23:00:00Z');
const at = (msAgo: number) => ({ toMillis: () => NOW - msAgo });

test('someone who checked in recently is here', () => {
    assert.equal(isLobbyViewerActive({ lastSeen: at(10_000) }, NOW), true);
    assert.equal(isLobbyViewerActive({ lastSeen: at(LOBBY_STALE_MS) }, NOW), true);
});

test('a ghost (no check-in for over 90 seconds) is not counted', () => {
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
