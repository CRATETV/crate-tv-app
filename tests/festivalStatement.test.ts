import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFestivalStatementHtml } from '../api/_lib/festivalStatement';
test('partner statement: watermark, split lines, paid status, no emails', () => {
    const html = buildFestivalStatementHtml({
        festival: 'Island Film Fest', payee: 'Island Arts Inc.', generatedAtMs: Date.parse('2026-11-15T15:00:00Z'),
        lines: [{ label: 'Block A', orders: 3, gross: 30 }], totals: { orders: 3, gross: 30 },
        payout: { gross: 30, deductions: 0, squareFees: 1.2, net: 28.8, crateSharePct: 30, crateAmount: 8.64, partnerAmount: 20.16 },
        paid: { amount: 20.16, atMs: Date.parse('2026-11-16T12:00:00Z'), note: 'Zelle' },
    });
    assert.match(html, /class="wm">CRATE TV</);
    assert.match(html, /Island Arts Inc\. receives/);
    assert.match(html, /\$20\.16/);
    assert.match(html, /Paid on/);
    assert.ok(!/\S+@\S+\.\S+/.test(html));
});
