import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promoProblem, priceAfterPromo, payWhatYouWantCents } from '../api/_lib/paymentRules.js';

const now = Date.parse('2027-03-01T00:00:00Z');

test('an unknown promo code is refused before any charge', () => {
    assert.ok(promoProblem(null, 'film1', now));
});

test('a used-up, expired or wrong-item code is refused at checkout (not just by the Apply button)', () => {
    assert.ok(promoProblem({ maxUses: 1, usedCount: 1 }, 'film1', now));
    assert.ok(promoProblem({ maxUses: 5, usedCount: 0, expiresAt: '2027-02-01T00:00:00Z' }, 'film1', now));
    assert.ok(promoProblem({ maxUses: 5, usedCount: 0, itemId: 'film2' }, 'film1', now));
    assert.ok(promoProblem({ usedCount: 0 }, 'film1', now), 'a code with no use limit set is refused');
    assert.equal(promoProblem({ maxUses: 5, usedCount: 4, itemId: 'film1' }, 'film1', now), null);
});

test('a discount can never make the price negative or larger', () => {
    assert.equal(priceAfterPromo(1000, { type: 'discount', discountValue: 25 }), 750);
    assert.equal(priceAfterPromo(1000, { type: 'discount', discountValue: 150 }), 0);
    assert.equal(priceAfterPromo(1000, { type: 'discount', discountValue: -50 }), 1000);
    assert.equal(priceAfterPromo(1000, { type: 'one_time_access' }), 0);
    assert.equal(priceAfterPromo(1000, { type: 'mystery' }), 1000);
});

test('pay what you want: $3 minimum, sensible maximum, real numbers only', () => {
    assert.equal(payWhatYouWantCents(3), 300);
    assert.equal(payWhatYouWantCents('7.50'), 750);
    assert.equal(payWhatYouWantCents(25), 2500);
    assert.equal(payWhatYouWantCents(2.99), null, 'under the minimum');
    assert.equal(payWhatYouWantCents(0), null);
    assert.equal(payWhatYouWantCents(-5), null);
    assert.equal(payWhatYouWantCents('abc'), null, 'LOOPHOLE: not a number must never skip the charge');
    assert.equal(payWhatYouWantCents(undefined), null);
    assert.equal(payWhatYouWantCents(100000), null, 'typo guard');
});
