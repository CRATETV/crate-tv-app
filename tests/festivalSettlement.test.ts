import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivalSettlement } from '../api/_lib/festivalSettlement';
import { buildStatementHtml } from '../api/_lib/partyStatement';

const FROM = '2027-01-01T00:00:00.000Z';

test('2026 festival: no fees taken off first, 70/30 of the full amount', () => {
    const r = festivalSettlement([{ cents: 1000, feeCents: 59, at: '2026-10-20T12:00:00Z' }, { cents: 2000, feeCents: 88, at: '2026-10-21T12:00:00Z' }], FROM);
    assert.equal(r.grossCents, 3000);
    assert.equal(r.sharedFeesCents, 0);
    assert.equal(r.owedToFestivalCents, 2100);
    assert.equal(r.crateKeepsCents, 900);
});

test('from the shared-fees date, card fees come off before the split', () => {
    const r = festivalSettlement([{ cents: 1000, feeCents: 100, at: '2027-02-01T12:00:00Z' }], FROM);
    assert.equal(r.sharedFeesCents, 100);
    assert.equal(r.owedToFestivalCents, 630);
    assert.equal(r.crateKeepsCents, 370);
});

test('a fee Square has not reported yet is counted as pending, not guessed', () => {
    const r = festivalSettlement([{ cents: 1000, feeCents: null, at: '2027-02-01T12:00:00Z' }], FROM);
    assert.equal(r.feesPending, 1);
    assert.equal(r.owedToFestivalCents, 700);
});

test('owed plus kept always equals what came in', () => {
    const r = festivalSettlement([{ cents: 999, feeCents: 61, at: '2027-03-01T00:00:00Z' }, { cents: 501, feeCents: 45, at: '2026-12-01T00:00:00Z' }], FROM);
    assert.equal(r.owedToFestivalCents + r.crateKeepsCents, r.grossCents);
});

test('printable statement has the CRATE TV watermark, escapes names, and no emails', () => {
    const html = buildStatementHtml({ film: '<b>Tricky</b> & Co', generatedAtMs: Date.parse('2026-11-15T15:00:00Z'), tickets: [{ atMs: 1, type: 'Ticket', amount: 5, fee: 0.5, promo: false }] });
    assert.match(html, /class="wm">CRATE TV</);
    assert.ok(!html.includes('<b>Tricky</b>'));
    assert.match(html, /&lt;b&gt;Tricky/);
});
