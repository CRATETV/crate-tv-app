// Double-charge detection and refund limits. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLikelyDuplicates, refundProblem, refundableCents } from '../api/_lib/duplicateCharges.js';

const at = (min: number) => new Date(Date.parse('2026-10-20T18:00:00Z') + min * 60_000).toISOString();
const c = (id: string, min: number, extra: Partial<Parameters<typeof findLikelyDuplicates>[0][number]> = {}) =>
    ({ id, createdAt: at(min), amount: 500, refunded: 0, note: 'VOD Rental: LUNA', email: 'ana@example.com', ...extra });

test('a second identical charge minutes later is flagged; the first is kept', () => {
    const d = findLikelyDuplicates([c('a', 0), c('b', 2)]);
    assert.equal(d.get('b'), 'a');
    assert.equal(d.has('a'), false);
});

test('three taps flag the second and third', () => {
    const d = findLikelyDuplicates([c('a', 0), c('b', 1), c('c', 3)]);
    assert.deepEqual([...d.entries()].sort(), [['b', 'a'], ['c', 'a']]);
});

test('different buyers, items, amounts or a long gap are not duplicates', () => {
    assert.equal(findLikelyDuplicates([c('a', 0), c('b', 2, { email: 'ben@example.com' })]).size, 0);
    assert.equal(findLikelyDuplicates([c('a', 0), c('b', 2, { note: 'VOD Rental: Tino' })]).size, 0);
    assert.equal(findLikelyDuplicates([c('a', 0), c('b', 2, { amount: 999 })]).size, 0);
    assert.equal(findLikelyDuplicates([c('a', 0), c('b', 60)]).size, 0);
});

test('already-refunded charges and unknown buyers are ignored', () => {
    assert.equal(findLikelyDuplicates([c('a', 0), c('b', 2, { refunded: 500 })]).size, 0);
    assert.equal(findLikelyDuplicates([c('a', 0, { email: null }), c('b', 2, { email: null })]).size, 0);
});

test('card last 4 is used when there is no email', () => {
    const d = findLikelyDuplicates([c('a', 0, { email: null, cardLast4: '4242' }), c('b', 1, { email: null, cardLast4: '4242' })]);
    assert.equal(d.get('b'), 'a');
});

test('refunds can never exceed what is left', () => {
    assert.equal(refundableCents({ amount: 500, refunded: 200 }), 300);
    assert.equal(refundProblem({ amount: 500, refunded: 0, status: 'COMPLETED' }, 500), null);
    assert.match(refundProblem({ amount: 500, refunded: 200 }, 400) || '', /at most \$3\.00/);
    assert.match(refundProblem({ amount: 500, refunded: 500 }, 100) || '', /already been fully refunded/);
    assert.ok(refundProblem({ amount: 500, refunded: 0 }, 0));
    assert.ok(refundProblem({ amount: 500, refunded: 0, status: 'FAILED' }, 100));
});
