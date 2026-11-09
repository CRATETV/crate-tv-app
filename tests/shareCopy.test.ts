import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareLink, trimSynopsis, wrapLines, instagramCaption } from '../api/_lib/shareCopy';

test('share link tags the source', () => {
    assert.equal(shareLink('https://cratetv.net/', 'abc 1'), 'https://cratetv.net/movie/abc%201?src=instagram');
});
test('trimSynopsis cuts at a word and adds an ellipsis', () => {
    assert.equal(trimSynopsis('short  one', 50), 'short one');
    const t = trimSynopsis('The quick brown fox jumps over the lazy dog again and again', 30);
    assert.ok(t.endsWith('…') && t.length <= 30, t);
    assert.ok(!t.includes('  '));
});
test('wrapLines wraps by measured width and caps lines', () => {
    const m = (s: string) => s.length;
    assert.deepEqual(wrapLines('aa bb cc dd', 5, m), ['aa bb', 'cc dd']);
    assert.deepEqual(wrapLines('aa bb cc dd ee ff', 5, m, 2), ['aa bb', 'cc dd…']);
    assert.deepEqual(wrapLines('', 5, m), []);
});
test('caption has title, director, link and hashtags', () => {
    const c = instagramCaption({ title: 'Neighbors', director: 'Sam', synopsis: 'Two families.' }, 'https://x/y');
    assert.match(c, /Neighbors — directed by Sam/);
    assert.match(c, /Two families\./);
    assert.match(c, /https:\/\/x\/y/);
});
