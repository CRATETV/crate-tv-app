import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumPartnerFees, partnerReference } from '../api/_lib/partnerFees.js';
import { computePayout } from '../api/_lib/partnerRules.js';

const sale = (ref: string, fee?: number) => ({ amount_money: { amount: 1000 }, reference_id: ref, ...(fee === undefined ? {} : { processing_fee: [{ amount_money: { amount: fee } }] }) });

test('Square fees are added up for one festival only', () => {
    const r = sumPartnerFees([sale('partner:hilltop', 59), sale('partner:hilltop', 59), sale('partner:other', 99), sale('', 30), sale('partner:hilltop')], 'hilltop');
    assert.deepEqual(r, { amount: 1.18, sales: 3, pending: 1 });
    assert.deepEqual(sumPartnerFees([], 'x'), { amount: 0, sales: 0, pending: 0 });
});

test('long festival ids match the shortened tag Square holds', () => {
    const id = 'a-very-long-festival-name-that-goes-on-and-on';
    assert.equal(partnerReference(id).length, 40);
    assert.equal(sumPartnerFees([sale(partnerReference(id), 100)], id).amount, 1);
});

test('the payout takes Square fees off the top, then splits', () => {
    // $1,000 sold, $50 deductions, $30 Square fees, Crate 30%: net 920, Crate 276, partner 644.
    assert.deepEqual(computePayout(1000, 50, 30, 30), { gross: 1000, deductions: 50, squareFees: 30, net: 920, crateSharePct: 30, crateAmount: 276, partnerAmount: 644 });
    assert.equal(computePayout(100, 0, 30, 500).net, 0);       // fees can never push the payout negative
    assert.equal(computePayout(1000, 0, 30).squareFees, 0);    // not counted unless given
});
