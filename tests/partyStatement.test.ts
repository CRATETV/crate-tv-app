import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatementCsv, statementFileName } from '../api/_lib/partyStatement';

const NOW = Date.parse('2026-11-15T15:00:00Z');
const t = (amount: number, atMs: number, extra = {}) => ({ atMs, type: 'Ticket' as const, amount, fee: amount > 0 ? 0.45 : null, promo: false, ...extra });

test('summary and a line per ticket, no emails', () => {
    const out = buildStatementCsv({
        film: "You Don't Know My Name", generatedAtMs: NOW,
        tickets: [t(4.99, NOW - 1000), t(0, NOW - 2000), t(3, NOW - 3000)],
        split: { squareFees: 0.9, feesPending: 0, filmmakerShare: 0.7, filmmakerAmount: 5.46, crateKeeps: 1.73 },
    });
    assert.match(out, /Tickets sold \(all\),3/);
    assert.match(out, /Paid tickets,2/);
    assert.match(out, /Free seats,1/);
    assert.match(out, /Buyers paid,7\.99/);
    assert.match(out, /Filmmaker share \(70%\),5\.46/);
    assert.match(out, /Free seat,0\.00,0\.00,No/);
    assert.ok(!/@/.test(out));
});

test('oldest ticket listed first and fees pending say so', () => {
    const out = buildStatementCsv({ film: 'F', generatedAtMs: NOW, tickets: [t(5, NOW - 10), t(5, NOW - 99999, { fee: null })] });
    const body = out.split('\r\n').filter(l => /Ticket,5\.00/.test(l));
    assert.match(body[0], /pending/);
});

test('commas and quotes in the film name are escaped', () => {
    assert.match(buildStatementCsv({ film: 'A "Big", Day', generatedAtMs: NOW, tickets: [] }), /Film,"A ""Big"", Day"/);
});

test('file name is safe and dated', () => {
    assert.equal(statementFileName("You Don't Know My Name", NOW), 'crate-tv-sales-you-don-t-know-my-name-2026-11-15.csv');
});
