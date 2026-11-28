import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validStoryId, dayKey, lastSevenDays } from '../api/_lib/zineStats.js';

test('validStoryId accepts real ids and refuses odd ones', () => {
    assert.equal(validStoryId('aB3dE5fG7hI9jK1lM2nO'), true);
    assert.equal(validStoryId('my-story_1'), true);
    for (const bad of ['', 'abc', 'has space here', 'a/b/c/d/e/f', '../../etc', 42, null, undefined, 'x'.repeat(65)]) assert.equal(validStoryId(bad), false);
});

test('dayKey is the UTC calendar day', () => {
    assert.equal(dayKey(new Date('2026-11-27T23:59:00Z')), '2026-11-27');
});

test('lastSevenDays adds today and the six days before, nothing older', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    const days = { '2026-11-27': 3, '2026-11-26': 2, '2026-11-21': 4, '2026-11-20': 100, 'junk': 9 };
    assert.equal(lastSevenDays(days, now), 9);
    assert.equal(lastSevenDays(undefined, now), 0);
});

test('read counts are owner-only on the server', () => {
    const src = readFileSync('api/admin-zine.ts', 'utf8');
    const block = src.slice(src.indexOf("case 'stats'"), src.indexOf("case 'saveStory'"));
    assert.match(block, /isMasterAdmin\(/);
    assert.match(block, /403/);
});

test('the story list a writer gets never carries read counts', () => {
    const src = readFileSync('api/admin-zine.ts', 'utf8');
    const block = src.slice(src.indexOf("case 'listStories'"), src.indexOf("case 'stats'"));
    assert.doesNotMatch(block, /STATS_COLLECTION|views/);
});
