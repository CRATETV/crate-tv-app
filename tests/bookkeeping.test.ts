import test from 'node:test';
import assert from 'node:assert/strict';
import { entryFromPartnerPayout, cleanEntry, dollarsToCents, entryFromPayout, totalsByPayee, entriesToCsv, payeeKey, FORM_1099_THRESHOLD_CENTS } from '../api/_lib/bookkeeping.js';

const NOW = '2026-10-31T20:00:00.000Z';

test('dollars become whole cents; junk and zero are refused', () => {
    assert.equal(dollarsToCents('$1,200.50'), 120050);
    assert.equal(dollarsToCents('12.345'), 1235);
    for (const bad of ['', 'abc', 0, -5, '0']) assert.equal(dollarsToCents(bad), null);
});

test('a manual entry is cleaned; missing payee, bad amount or future date is refused', () => {
    const ok = cleanEntry({ payee: '  Ada   Lovelace ', amount: '25', date: '2026-10-01', category: 'partner', method: 'Zelle' }, NOW);
    assert.equal(ok.entry?.payee, 'Ada Lovelace'); assert.equal(ok.entry?.amountCents, 2500); assert.equal(ok.entry?.category, 'partner');
    assert.ok(cleanEntry({ amount: '5' }, NOW).error);
    assert.ok(cleanEntry({ payee: 'A', amount: '0' }, NOW).error);
    assert.ok(cleanEntry({ payee: 'A', amount: '5', date: '2027-01-01' }, NOW).error);
    assert.equal(cleanEntry({ payee: 'A', amount: '5', category: 'weird' }, NOW).entry?.category, 'other');
});

test('a completed payout request becomes a filmmaker entry', () => {
    const e = entryFromPayout('abc', { directorName: 'Jon Owens', amount: 4790, filmTitles: ['From Now'] }, NOW);
    assert.deepEqual([e.payee, e.amountCents, e.category, e.film, e.source, e.sourceId, e.date], ['Jon Owens', 4790, 'filmmaker', 'From Now', 'payout', 'abc', '2026-10-31']);
});

test('yearly totals group names, skip voided and expenses, and flag 1099s', () => {
    const base = { method: '', film: '', reference: '', note: '', source: 'manual' as const, sourceId: '' };
    const rows = [
        { ...base, date: '2026-02-01', payee: 'Jon Owens', amountCents: 150000, category: 'filmmaker' as const },
        { ...base, date: '2026-05-01', payee: 'jon  owens', amountCents: 50000, category: 'filmmaker' as const },
        { ...base, date: '2026-05-02', payee: 'Jon Owens', amountCents: 99999, category: 'filmmaker' as const, void: true },
        { ...base, date: '2026-06-01', payee: 'Hosting Co', amountCents: 900000, category: 'expense' as const },
        { ...base, date: '2025-06-01', payee: 'Old', amountCents: 100, category: 'other' as const },
    ];
    const t = totalsByPayee(rows, 2026);
    assert.equal(t.length, 1);
    assert.deepEqual([t[0].totalCents, t[0].count, t[0].needs1099], [200000, 2, true]);
    assert.equal(FORM_1099_THRESHOLD_CENTS, 200000);
    assert.equal(payeeKey(' Jon   OWENS '), 'jon owens');
});

test('CSV quotes commas and neutralises spreadsheet formulas', () => {
    const csv = entriesToCsv([{ date: '2026-01-01', payee: '=HYPERLINK("x")', amountCents: 1050, method: 'PayPal', category: 'other', film: 'A, B', reference: '', note: '', source: 'manual', sourceId: '' }]);
    const [, row] = csv.split('\n');
    assert.ok(row.startsWith(`2026-01-01,"'=HYPERLINK(""x"")",10.50,PayPal,other,"A, B"`));
});

test('a partner festival payout becomes a partner entry in cents', () => {
    const e = entryFromPartnerPayout('p1', { name: 'Island Film Fest', payeeName: 'Island Arts LLC' }, 123.45, 'Zelle', '2026-11-02T10:00:00.000Z');
    assert.deepEqual([e.payee, e.amountCents, e.category, e.film, e.note, e.source, e.sourceId, e.date], ['Island Arts LLC', 12345, 'partner', 'Island Film Fest', 'Zelle', 'partner', 'p1', '2026-11-02']);
});
