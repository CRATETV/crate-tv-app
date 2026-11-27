import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSendTime, buildScheduledRecord, dueScheduled, tomorrowAt } from '../api/_lib/mailSchedule.js';

const NOW = Date.parse('2026-11-27T23:00:00Z');

test('checkSendTime accepts a normal future time', () => {
    const r = checkSendTime('2026-11-28T14:00:00Z', NOW);
    assert.equal(r.ok, true);
});

test('checkSendTime refuses bad, past and far-off times', () => {
    assert.equal(checkSendTime('', NOW).ok, false);
    assert.equal(checkSendTime('not a date', NOW).ok, false);
    assert.equal(checkSendTime('2026-11-27T22:00:00Z', NOW).ok, false);
    assert.equal(checkSendTime('2026-11-27T23:00:30Z', NOW).ok, false); // under a minute away
    assert.equal(checkSendTime('2027-03-01T00:00:00Z', NOW).ok, false); // more than 60 days
});

test('buildScheduledRecord shows in Sent as scheduled with the body kept for later', () => {
    const r = buildScheduledRecord({ fromEmail: 'studio@cratetv.net', to: 'a@b.com', subject: 'Hi', htmlBody: 'Hello<br/>there', text: 'Hello\nthere', signatureId: 'crate', sendAtMs: NOW + 3_600_000, nowIso: '2026-11-27T23:00:00.000Z' });
    assert.equal(r.direction, 'out');
    assert.equal(r.status, 'scheduled');
    assert.equal(r.scheduledFor, '2026-11-28T00:00:00.000Z');
    assert.deepEqual(r.to, ['a@b.com']);
    assert.equal(r.htmlBody, 'Hello<br/>there');
});

test('dueScheduled picks only scheduled emails whose time has come, oldest first', () => {
    const docs = [
        { id: 'later', status: 'scheduled', scheduledFor: '2026-11-29T00:00:00Z' },
        { id: 'b', status: 'scheduled', scheduledFor: '2026-11-27T22:30:00Z' },
        { id: 'a', status: 'scheduled', scheduledFor: '2026-11-27T21:00:00Z' },
        { id: 'sent', status: undefined, scheduledFor: '2026-11-27T20:00:00Z' },
        { id: 'busy', status: 'sending', scheduledFor: '2026-11-27T20:00:00Z' },
    ];
    assert.deepEqual(dueScheduled(docs, NOW).map(d => d.id), ['a', 'b']);
});

test('tomorrowAt gives tomorrow at that local hour', () => {
    const t = tomorrowAt(new Date(2026, 10, 27, 18, 6), 9);
    assert.equal(t.getDate(), 28);
    assert.equal(t.getHours(), 9);
    assert.equal(t.getMinutes(), 0);
    const eom = tomorrowAt(new Date(2026, 10, 30, 23, 59), 8);
    assert.equal(eom.getMonth(), 11);
    assert.equal(eom.getDate(), 1);
});
