import test from 'node:test';
import assert from 'node:assert/strict';
import { splittableCents, reportedFeeCents, feeIsShared, FILM_FEES_SHARED_FROM } from '../api/_lib/filmFees.js';

const pay = (amount: number, created_at: string, fee?: number) => ({ amount_money: { amount }, created_at, processing_fee: fee === undefined ? [] : [{ amount_money: { amount: fee } }] });

test('before the start date the full price is split, fee or not', () => {
    assert.equal(splittableCents(pay(499, '2026-10-20T12:00:00Z', 45)), 499);
});
test('after the start date the reported fee comes off the top', () => {
    assert.equal(splittableCents(pay(499, '2026-11-02T12:00:00Z', 45)), 454);
});
test('an unreported fee counts in full for now; fees add up; never below zero', () => {
    assert.equal(splittableCents(pay(499, '2026-11-02T12:00:00Z')), 499);
    assert.equal(reportedFeeCents({ processing_fee: [{ amount_money: { amount: 30 } }, { amount_money: { amount: 15 } }] }), 45);
    assert.equal(reportedFeeCents({ processing_fee: [] }), null);
    assert.equal(splittableCents(pay(20, '2026-11-02T12:00:00Z', 45)), 0);
});
test('the start date is exact', () => {
    assert.equal(feeIsShared(FILM_FEES_SHARED_FROM), true);
    assert.equal(feeIsShared('2026-10-31T23:59:59Z'), false);
    assert.equal(feeIsShared(undefined), false);
});
