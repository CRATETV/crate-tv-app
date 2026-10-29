import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, mergeRecipients, reminderToken, verifyReminderToken, reminderWords } from '../api/_lib/premiereReminders.js';

const MIN = 60_000, HOUR = 60 * MIN;
const start = Date.UTC(2026, 10, 13, 23, 0);

test('a day before: due in the window, once', () => {
    assert.deepEqual(dueReminders(start, start - 24 * HOUR, {}), ['day']);
    assert.deepEqual(dueReminders(start, start - 24 * HOUR + 60 * MIN, {}), ['day']);        // late tick still sends
    assert.deepEqual(dueReminders(start, start - 24 * HOUR - MIN, {}), []);                  // too early
    assert.deepEqual(dueReminders(start, start - 24 * HOUR + 2 * HOUR, {}), []);             // window over
    assert.deepEqual(dueReminders(start, start - 24 * HOUR, { day: true }), []);             // already sent
});

test('15 minutes before', () => {
    assert.deepEqual(dueReminders(start, start - 15 * MIN, {}), ['soon']);
    assert.deepEqual(dueReminders(start, start - 10 * MIN, {}), ['soon']);
    assert.deepEqual(dueReminders(start, start - 4 * MIN, {}), []);
    assert.deepEqual(dueReminders(start, start - 15 * MIN, { soon: { seconds: 1 } }), []);
});

test('a premiere set up an hour ahead gets no "tomorrow" email, and none after it starts', () => {
    assert.deepEqual(dueReminders(start, start - HOUR, undefined), []);
    assert.deepEqual(dueReminders(start, start + MIN, {}), []);
    assert.deepEqual(dueReminders(NaN, start, {}), []);
});

test('mergeRecipients: lowercase, valid, unique', () => {
    assert.deepEqual(mergeRecipients(['A@x.com', 'bad', ' a@x.com '], new Set(['b@y.org', 5 as any]), null, undefined), ['a@x.com', 'b@y.org']);
});

test('reminder tokens: only the server can make them', () => {
    const t = reminderToken('secret', 'film-1', 'uid9');
    assert.deepEqual(verifyReminderToken('secret', t), { movieKey: 'film-1', uid: 'uid9' });
    assert.equal(verifyReminderToken('other', t), null);
    assert.equal(verifyReminderToken('secret', t + 'x'), null);
    assert.equal(verifyReminderToken('secret', 'nope'), null);
    assert.equal(verifyReminderToken('', t), null);
    const [p] = t.split('.');
    assert.equal(verifyReminderToken('secret', `${p}.AAAA`), null);
});

test('reminderWords differ by stage', () => {
    assert.match(reminderWords('day', 'T', 'Fri').subject, /^Tomorrow/);
    assert.match(reminderWords('soon', 'T', 'Fri').subject, /15 minutes/);
});
