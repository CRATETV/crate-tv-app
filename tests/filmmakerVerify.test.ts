import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onFileMatch } from '../api/_lib/filmmakerVerify.js';

const movies: any[] = [
    { key: 'luna', title: 'Luna', director: 'Jane Doe', producers: 'Sam Lee' },
    { key: 'tide', title: 'Tide', director: 'Other Person' },
];
const none = { agreements: [], submissions: [], payeeEmail: null };

test('LOOPHOLE: knowing a credited name is not enough to open their dashboard', () => {
    assert.equal(onFileMatch('Jane Doe', 'stranger@evil.com', movies, none), null);
});

test('an agreement CRATE sent to this person by name proves it', () => {
    assert.ok(onFileMatch('Jane Doe', 'jane@x.com', movies, { ...none, agreements: [{ recipientName: 'Jane Doe', movieKey: 'luna', status: 'sent' }] }));
    assert.equal(onFileMatch('Sam Lee', 'sam@x.com', movies, { ...none, agreements: [{ recipientName: 'Jane Doe', movieKey: 'luna' }] }), null, 'a co-credit on the same film is not enough');
    assert.equal(onFileMatch('Jane Doe', 'jane@x.com', movies, { ...none, agreements: [{ recipientName: 'Jane Doe', status: 'void' }] }), null, 'voided agreements do not count');
});

test('only an APPROVED film submission from this email proves it', () => {
    assert.ok(onFileMatch('Jane Doe', 'jane@x.com', movies, { ...none, submissions: [{ director: 'Jane Doe, Bob', title: 'Something', status: 'approved' }] }));
    assert.ok(onFileMatch('Jane Doe', 'jane@x.com', movies, { ...none, submissions: [{ director: 'J. Doe', title: 'LUNA', status: 'catalog' }] }));
    assert.equal(onFileMatch('Jane Doe', 'evil@x.com', movies, { ...none, submissions: [{ director: 'Jane Doe', title: 'Fake', status: 'submitted' }] }), null, 'LOOPHOLE: a fresh submission typing her name');
});

test('the payout email entered in admin proves it', () => {
    assert.ok(onFileMatch('Jane Doe', 'Jane@X.com', movies, { ...none, payeeEmail: 'jane@x.com' }));
    assert.equal(onFileMatch('Jane Doe', 'jane@x.com', movies, { ...none, payeeEmail: 'other@x.com' }), null);
});
