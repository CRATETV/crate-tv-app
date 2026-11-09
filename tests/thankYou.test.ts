import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueViewers, fillThankYou, firstName, thankYouSubject, ViewerRow } from '../api/_lib/thankYou';

const H = 3600_000, NOW = 1_800_000_000_000;
const v = (o: Partial<ViewerRow>): ViewerRow => ({ id: 'x', movieKey: 'm1', email: 'A@x.com', name: 'Ann Lee', lastSeenMs: NOW - 14 * H, ...o });

test('due: only people who joined 12-72 hours ago with an email', () => {
    assert.equal(dueViewers([v({})], NOW).length, 1);
    assert.equal(dueViewers([v({ lastSeenMs: NOW - 2 * H })], NOW).length, 0);   // party may still be on
    assert.equal(dueViewers([v({ lastSeenMs: NOW - 100 * H })], NOW).length, 0); // too old
    assert.equal(dueViewers([v({ email: null })], NOW).length, 0);
    assert.equal(dueViewers([v({ thanked: true })], NOW).length, 0);
});
test('skips live parties, test parties and opt-outs; one email per person per film', () => {
    assert.equal(dueViewers([v({})], NOW, { liveKeys: new Set(['m1']) }).length, 0);
    assert.equal(dueViewers([v({})], NOW, { skipKeys: new Set(['m1']) }).length, 0);
    assert.equal(dueViewers([v({})], NOW, { optedOut: new Set(['a@x.com']) }).length, 0);
    assert.equal(dueViewers([v({ id: '1' }), v({ id: '2', email: 'a@X.com' })], NOW).length, 1);
    assert.equal(dueViewers([v({ id: '1' }), v({ id: '2', movieKey: 'm2' })], NOW).length, 2);
});
test('message fills the name and film', () => {
    assert.equal(firstName('Ann Lee'), 'Ann');
    assert.equal(firstName('Film Lover'), 'there');
    assert.equal(fillThankYou('Hi {name}, {film}!', { name: 'Ann Lee', film: 'Neighbors' }), 'Hi Ann, Neighbors!');
    assert.match(fillThankYou('', { name: null, film: 'Neighbors' }), /Hi there,[\s\S]*Neighbors/);
    assert.equal(thankYouSubject('Neighbors'), 'Thank you for watching Neighbors');
});
