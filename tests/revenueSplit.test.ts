// Revenue splits and payout links. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySignedPayees, splitRevenue, payeeFractions, filmmakerShareOf, cleanDeal, payoutLink } from '../api/_lib/revenueSplit.js';

test('default split is 70% filmmaker, 30% CRATE', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz' }, undefined);
    assert.equal(r.filmmakerAmount, 700);
    assert.equal(r.crateAmount, 300);
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ana Ruiz', 700]]);
});

test('co-credits share the filmmaker side instead of each getting all of it', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz', producers: 'Ben Cole' }, undefined);
    assert.equal(r.filmmakerAmount, 700);
    assert.deepEqual(r.payees.map(p => p.amount), [350, 350]);
});

test('pennies are never created or lost', () => {
    const r = splitRevenue(1001, { director: 'A, B, C' }, undefined);
    assert.equal(r.filmmakerAmount + r.crateAmount, 1001);
    assert.equal(r.payees.reduce((s, p) => s + p.amount, 0), r.filmmakerAmount);
});

test('the same person credited twice is paid once', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz', producers: ' ana ruiz ' }, undefined);
    assert.equal(r.payees.length, 1);
    assert.equal(r.payees[0].amount, 700);
});

test('a custom deal changes the split and the payees', () => {
    const deal = { filmmakerShare: 0.8, payees: [{ name: 'Ana Ruiz', share: 60 }, { name: 'Studio X', share: 40 }] };
    const r = splitRevenue(10000, { director: 'Someone Else' }, deal);
    assert.equal(r.filmmakerAmount, 8000);
    assert.equal(r.crateAmount, 2000);
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ana Ruiz', 4800], ['Studio X', 3200]]);
});

test('no credited filmmaker means nothing is owed yet', () => {
    const r = splitRevenue(500, { director: '' }, undefined);
    assert.equal(r.filmmakerAmount, 0);
    assert.equal(r.crateAmount, 500);
});

test('bad share values fall back safely', () => {
    assert.equal(filmmakerShareOf({ filmmakerShare: 5 }), 1);
    assert.equal(filmmakerShareOf({ filmmakerShare: -1 }), 0);
    assert.equal(filmmakerShareOf({ filmmakerShare: NaN }), 0.7);
    assert.deepEqual(payeeFractions({ director: 'A' }, { payees: [{ name: 'X', share: 0 }] }).map(p => p.name), ['A']);
});

test('admin form validation', () => {
    assert.ok(cleanDeal({ filmmakerPercent: 120 }).error);
    assert.equal(cleanDeal({ filmmakerPercent: 80 }).deal?.filmmakerShare, 0.8);
    assert.equal(cleanDeal({ filmmakerPercent: 72.5 }).deal?.filmmakerShare, 0.725);
});

test('payout links fill in the amount', () => {
    assert.equal(payoutLink('paypal', 'paypal.me/anaruiz', 1250), 'https://www.paypal.com/paypalme/anaruiz/12.50USD');
    assert.equal(payoutLink('cashapp', '$anaruiz', 500), 'https://cash.app/$anaruiz/5.00');
    assert.match(payoutLink('venmo', '@ana-ruiz', 500) || '', /^https:\/\/venmo\.com\/ana-ruiz\?txn=pay&amount=5\.00/);
    assert.equal(payoutLink('zelle', 'ana@example.com', 500), null);
    assert.equal(payoutLink('paypal', 'javascript:alert(1)', 500), null);
});

test('the person who signed the agreement is paid, unless the deal names someone on purpose', () => {
    const merged = applySignedPayees(
        { luna: { filmmakerShare: 0.8 }, onpurpose: { payees: [{ name: 'Pat Doe', share: 100 }] } },
        { luna: { name: ' Ben Cole ' }, onpurpose: { name: 'Ben Cole' }, fresh: { name: 'Ana Ruiz' }, blank: { name: '  ' } },
    );
    assert.deepEqual(merged.luna, { filmmakerShare: 0.8, payees: [{ name: 'Ben Cole', share: 100 }] });
    assert.deepEqual(merged.onpurpose.payees, [{ name: 'Pat Doe', share: 100 }]);
    assert.deepEqual(merged.fresh.payees, [{ name: 'Ana Ruiz', share: 100 }]);
    assert.equal(merged.blank, undefined);
    const r = splitRevenue(1000, { director: 'Cy Dunn, Ben Cole' }, merged.luna);
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ben Cole', 800]]);
});
