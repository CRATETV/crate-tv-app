import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describePayment, recentPayments } from '../api/_lib/recentPayments.js';

test('turns payment notes into plain words', () => {
    assert.deepEqual(describePayment("Watch Party Ticket: You Don't Know My Name"), { what: 'Ticket', film: "You Don't Know My Name" });
    assert.deepEqual(describePayment('Watch Party Ticket (Block): Sun Shorts'), { what: 'Block ticket', film: 'Sun Shorts' });
    assert.deepEqual(describePayment('Support for film: "Neighbors"'), { what: 'Tip', film: 'Neighbors' });
    assert.deepEqual(describePayment('VOD Rental: Hard Times'), { what: 'Rental', film: 'Hard Times' });
    assert.deepEqual(describePayment('Crate TV Purchase'), { what: 'Payment', film: '' });
    assert.deepEqual(describePayment(undefined), { what: 'Payment', film: '' });
});

const T = (h: number) => new Date(Date.parse('2026-11-13T12:00:00Z') + h * 3600_000).toISOString();

test('counts payments that arrived since "Got it", newest first', () => {
    const rows = [
        { id: 'a', createdAt: T(0), status: 'COMPLETED', amount: 300, note: 'Watch Party Ticket: X' },
        { id: 'b', createdAt: T(5), status: 'COMPLETED', amount: 499, note: 'Watch Party Ticket: X' },
        { id: 'c', createdAt: T(6), status: 'COMPLETED', amount: 1000, note: 'Support for film: "X"' },
    ];
    const r = recentPayments(rows, Date.parse(T(1)));
    assert.deepEqual(r.lines.map(l => l.id), ['c', 'b', 'a']);
    assert.deepEqual([r.newCount, r.newCents], [2, 1499]);
});

test('skips failed and fully refunded payments; subtracts partial refunds', () => {
    const r = recentPayments([
        { id: 'a', createdAt: T(1), status: 'FAILED', amount: 300 },
        { id: 'b', createdAt: T(2), status: 'COMPLETED', amount: 300, refunded: 300 },
        { id: 'c', createdAt: T(3), status: 'COMPLETED', amount: 500, refunded: 200, note: 'VOD Rental: X' },
    ], 0);
    assert.deepEqual(r.lines.map(l => [l.id, l.cents]), [['c', 300]]);
});

test('first visit (never pressed Got it) shows everything as new; empty list is safe', () => {
    assert.equal(recentPayments([{ id: 'a', createdAt: T(1), status: 'COMPLETED', amount: 300 }], 0).newCount, 1);
    assert.deepEqual(recentPayments([], 0), { lines: [], newCount: 0, newCents: 0 });
});

test('only the newest few lines are returned, but the new count is complete', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), createdAt: T(i), status: 'COMPLETED', amount: 100 }));
    const r = recentPayments(many, 0, 5);
    assert.equal(r.lines.length, 5);
    assert.equal(r.newCount, 20);
});
