// Revenue splits and payout links. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitRevenue, payeeFractions, filmmakerShareOf, cleanDeal, payoutLink } from '../api/_lib/revenueSplit.js';

test('default split is 70% filmmaker, 30% CRATE', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz' }, undefined);
    assert.equal(r.filmmakerAmount, 700);
    assert.equal(r.crateAmount, 300);
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ana Ruiz', 700]]);
});

test('co-credits are not divided: the first credited person is paid the whole filmmaker side', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz', producers: 'Ben Cole' }, undefined);
    assert.equal(r.filmmakerAmount, 700);
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ana Ruiz', 700]]);
    const twoDirectors = splitRevenue(1000, { director: 'Cy Dunn, Ana Ruiz' }, undefined);
    assert.deepEqual(twoDirectors.payees.map(p => p.name), ['Cy Dunn']);
    const producerOnly = splitRevenue(1000, { director: '', producers: 'Ben Cole, Di Fox' }, undefined);
    assert.deepEqual(producerOnly.payees.map(p => p.name), ['Ben Cole']);
});

test('naming one payee in the deal pays that person instead', () => {
    const r = splitRevenue(1000, { director: 'Ana Ruiz, Ben Cole' }, { payees: [{ name: 'Ben Cole', share: 100 }] });
    assert.deepEqual(r.payees.map(p => [p.name, p.amount]), [['Ben Cole', 700]]);
});

test('pennies are never created or lost', () => {
    const r = splitRevenue(1001, { director: 'A' }, { payees: [{ name: 'A', share: 1 }, { name: 'B', share: 1 }, { name: 'C', share: 1 }] });
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
