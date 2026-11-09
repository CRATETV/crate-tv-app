import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleAlertRecipients, shouldAlertSale, saleAlertSubject } from '../api/_lib/saleAlert';

test('recipients: technical email plus owners, no duplicates, blanks dropped', () => {
    assert.deepEqual(saleAlertRecipients('a@x.com', ['A@x.com', 'b@x.com', ' ']), ['a@x.com', 'b@x.com']);
    assert.deepEqual(saleAlertRecipients(undefined, ['b@x.com']), ['b@x.com']);
    assert.deepEqual(saleAlertRecipients('', []), []);
});
test('free tickets do not alert', () => {
    assert.equal(shouldAlertSale(0), false);
    assert.equal(shouldAlertSale(NaN), false);
    assert.equal(shouldAlertSale(300), true);
});
test('subject says what was bought and how much', () => {
    assert.equal(saleAlertSubject('Support for film: "Neighbors"', 500), '💰 Tip: Neighbors — $5.00');
    assert.equal(saleAlertSubject('Watch Party Ticket: Neighbors', 300), '💰 Ticket: Neighbors — $3.00');
    assert.equal(saleAlertSubject('Crate TV Purchase', 1000), '💰 Payment — $10.00');
});
