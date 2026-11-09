import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The lobby check-in (lastSeen) is written by the browser. If the database rules
// don't allow that field, EVERY lobby sign-in is rejected and the "waiting" count
// sits at 0. (This happened in Nov 2026.) Keep the rule and the code in step.
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const block = rules.slice(rules.indexOf('match /lobby_viewers/{viewerId}'));
const lobbyRule = block.slice(0, block.indexOf('allow delete'));

test('the lobby_viewers rule allows the lastSeen check-in field, and only as a timestamp', () => {
    assert.match(lobbyRule, /hasOnly\(\[[^\]]*'lastSeen'[^\]]*\]\)/);
    assert.match(lobbyRule, /lastSeen is timestamp/);
});

test('the lobby_viewers rule still allows only the fields the lobby writes', () => {
    const m = lobbyRule.match(/hasOnly\(\[([^\]]*)\]\)/);
    const fields = (m?.[1] || '').split(',').map(x => x.replace(/['\s]/g, '')).sort();
    assert.deepEqual(fields, ['avatar', 'joinedAt', 'lastSeen', 'name']);
});
