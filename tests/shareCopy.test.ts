import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareLink, trimSynopsis, wrapLines, instagramCaption, detectKind, shareWording, premiereWhen } from '../api/_lib/shareCopy';

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

const party = { title: 'X', isWatchPartyEnabled: true, watchPartyStartTime: '2026-11-13T19:30:00-05:00', isWatchPartyPaid: true, watchPartyPayWhatYouWant: true };
test('premiere detection', () => {
    const before = Date.parse('2026-11-09T12:00:00-05:00');
    assert.equal(detectKind(party, before), 'premiere');
    assert.equal(detectKind(party, Date.parse('2026-11-14T12:00:00-05:00')), 'streaming');
    assert.equal(detectKind({ title: 'X' }, before), 'streaming');
});
test('premiere wording names the day, time, price and the Premieres section', () => {
    assert.equal(premiereWhen(party.watchPartyStartTime), 'Friday, November 13 · 7:30 PM ET');
    const w = shareWording(party, 'premiere');
    assert.equal(w.badge, 'LIVE PREMIERE');
    assert.match(w.price, /Pay what you want/);
    assert.match(w.cta, /Premieres section/);
    assert.equal(shareWording({ title: 'X' }, 'streaming').badge, 'NOW STREAMING');
});
test('premiere caption leads with PREMIERE and the date', () => {
    const c = instagramCaption({ ...party, title: 'Name', synopsis: 'Hi.' }, 'https://x', 'premiere');
    assert.match(c, /PREMIERE — Name/);
    assert.match(c, /Friday, November 13 · 7:30 PM ET/);
    assert.match(c, /Premieres section/);
});
