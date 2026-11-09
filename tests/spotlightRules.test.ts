import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spotlightStatus, nextSendDate, firstMonday } from '../api/_lib/spotlightRules.js';

const d = (s: string) => new Date(s + 'T12:00:00');

test('first Monday of a month', () => {
    assert.equal(firstMonday(2026, 10).getDate(), 2);   // Nov 2, 2026
    assert.equal(firstMonday(2026, 11).getDate(), 7);   // Dec 7, 2026
});

test('nothing picked -> needs a pick', () => {
    assert.equal(spotlightStatus({}, d('2026-11-08')), 'needs-pick');
    assert.equal(spotlightStatus(null, d('2026-11-08')), 'needs-pick');
});

test('picked but not sent yet -> scheduled, no nagging', () => {
    assert.equal(spotlightStatus({ movieKey: 'a', setAt: d('2026-11-08') }, d('2026-11-09')), 'scheduled');
});

test('sent this month -> quiet until the last week, then asks for the next one', () => {
    const doc = { movieKey: 'a', setAt: d('2026-10-20'), sentAt: d('2026-11-02') };
    assert.equal(spotlightStatus(doc, d('2026-11-08')), 'sent');
    assert.equal(spotlightStatus(doc, d('2026-11-21')), 'sent');
    assert.equal(spotlightStatus(doc, d('2026-11-22')), 'needs-pick');
});

test('a new film picked after the last send counts as lined up', () => {
    const doc = { movieKey: 'b', setAt: d('2026-11-25'), sentAt: d('2026-11-02') };
    assert.equal(spotlightStatus(doc, d('2026-11-26')), 'scheduled');
});

test('sent last month and never re-picked -> needs a pick', () => {
    assert.equal(spotlightStatus({ movieKey: 'a', setAt: d('2026-09-20'), sentAt: d('2026-10-05') }, d('2026-11-08')), 'needs-pick');
});

test('Firestore-style timestamps work', () => {
    const doc = { movieKey: 'a', sentAt: { _seconds: Date.parse('2026-11-02T14:00:00Z') / 1000 } };
    assert.equal(spotlightStatus(doc, d('2026-11-08')), 'sent');
});

test('next send: this month if it has not happened yet, otherwise next month', () => {
    assert.equal(nextSendDate({ movieKey: 'a' }, d('2026-12-01')).getDate(), 7);                    // Dec 7 still ahead
    assert.equal(nextSendDate({ movieKey: 'a' }, d('2026-11-08')).getMonth(), 11);                  // Nov 2 passed -> Dec 7
    assert.equal(nextSendDate({ movieKey: 'a', sentAt: d('2026-12-07') }, d('2026-12-08')).getMonth(), 0); // sent -> Jan
    assert.equal(nextSendDate({ movieKey: 'a', sentAt: d('2026-11-02') }, d('2026-11-02')).getMonth(), 11);
});
