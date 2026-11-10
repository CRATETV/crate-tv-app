import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tieOut, phillyMonth, linesForMonth, ledgerCsv, LedgerLine } from '../api/_lib/moneyLedger.js';

const line = (o: Partial<LedgerLine>): LedgerLine => ({ id: 'p', at: '2026-11-05T15:00:00Z', kind: 'ticket', label: 'Film', gross: 1000, filmmakers: 0, crate: 0, festival: 0, partner: 0, cardFees: 0, owedTo: [], ...o });

test('every cent lands in exactly one place, so the lines balance', () => {
    const lines = [
        line({ gross: 1000, filmmakers: 665, crate: 285, cardFees: 50 }),   // film ticket, fee shared
        line({ gross: 500, festival: 500, kind: 'festival' }),
        line({ gross: 300, partner: 300, kind: 'partner' }),
        line({ gross: 200, crate: 200, kind: 'other' }),
    ];
    const t = tieOut(lines);
    assert.equal(t.gross, 2000);
    assert.equal(t.difference, 0);
    assert.equal(t.balanced, true);
});

test('a missing cent is reported, not hidden', () => {
    const t = tieOut([line({ gross: 1000, filmmakers: 700, crate: 299 })]);
    assert.equal(t.difference, 1);
    assert.equal(t.balanced, false);
});

test('money held only because nobody is credited is counted separately', () => {
    const t = tieOut([line({ gross: 1000, crate: 1000, flag: 'no-credit' }), line({ gross: 100, crate: 100 })]);
    assert.equal(t.heldNoCredit, 1000);
    assert.equal(t.balanced, true);
});

test('months are Philadelphia months', () => {
    assert.equal(phillyMonth('2026-11-01T03:00:00Z'), '2026-10'); // still Oct 31, 11pm in Philadelphia
    assert.equal(phillyMonth('2026-11-01T06:00:00Z'), '2026-11');
    assert.equal(phillyMonth(undefined), 'unknown');
    const lines = [line({ at: '2026-11-01T03:00:00Z' }), line({ at: '2026-11-10T12:00:00Z' })];
    assert.equal(linesForMonth(lines, '2026-11').length, 1);
});

test('csv has a header, dollars, and quotes titles that contain commas or quotes', () => {
    const csv = ledgerCsv([line({ label: 'Hi, "you"', gross: 1250, filmmakers: 800, crate: 450, owedTo: ['A', 'B'] })]);
    const rows = csv.split('\n');
    assert.equal(rows.length, 2);
    assert.match(rows[1], /"Hi, ""you"""/);
    assert.match(rows[1], /12\.50,8\.00,4\.50/);
    assert.match(rows[1], /"A; B"/);
});
