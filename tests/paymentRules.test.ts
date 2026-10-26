import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promoProblem, priceAfterPromo } from '../api/_lib/paymentRules.js';

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
