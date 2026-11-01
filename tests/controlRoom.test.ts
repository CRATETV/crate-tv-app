import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSales, summarizeSales, findDroppedViewers, activePin, PIN_MAX_AGE_MS } from '../api/_lib/controlRoom';

const NOW = Date.parse('2027-03-20T20:30:00Z');
const MIN = 60_000;

test('sales: totals, average, recent first, last 15 minutes', () => {
    const s = summarizeSales([
        { amountPaid: 5, email: 'a@x.com', purchasedAtMs: NOW - 60 * MIN },
        { amountPaid: 10, email: 'b@x.com', purchasedAtMs: NOW - 5 * MIN, promoCode: 'X' },
        { amountPaid: 3.5, email: 'c@x.com', purchasedAtMs: NOW - 1 * MIN, paymentType: 'movie' },
    ], NOW);
    assert.equal(s.tickets, 3);
    assert.equal(s.revenue, 18.5);
    assert.equal(s.averagePaid, 6.17);
    assert.equal(s.last15Min, 2);
    assert.equal(s.withPromo, 1);
    assert.equal(s.recent[0].email, 'c@x.com');
    assert.equal(s.recent[0].type, 'rental');
});

test('sales: nothing sold', () => {
    const s = summarizeSales([], NOW);
    assert.equal(s.tickets, 0);
    assert.equal(s.averagePaid, 0);
});

test('sales: bad amounts count as zero', () => {
    const s = summarizeSales([{ amountPaid: 'lots' }, { amountPaid: NaN }, { amountPaid: 4 }], NOW);
    assert.equal(s.revenue, 4);
});

const sess = (o: Partial<Parameters<typeof findDroppedViewers>[0][number]>) => ({
    userId: 'u', startedAtMs: NOW - 30 * MIN, lastHeartbeatMs: null, endedAtMs: null, watchSeconds: 600, device: 'desktop', ...o,
});

test('dropped: someone still watching is not listed', () => {
    assert.deepEqual(findDroppedViewers([sess({ lastHeartbeatMs: NOW - 10_000 })], NOW), []);
});

test('dropped: went quiet 3 minutes ago is listed as quiet', () => {
    const d = findDroppedViewers([sess({ lastHeartbeatMs: NOW - 3 * MIN })], NOW);
    assert.equal(d.length, 1);
    assert.equal(d[0].how, 'quiet');
    assert.equal(d[0].watchedMinutes, 10);
});

test('dropped: closed the page is listed as left', () => {
    const d = findDroppedViewers([sess({ lastHeartbeatMs: NOW - 2 * MIN, endedAtMs: NOW - 2 * MIN })], NOW);
    assert.equal(d[0].how, 'left');
});

test('dropped: came back in a new session is not listed', () => {
    const d = findDroppedViewers([
        sess({ lastHeartbeatMs: NOW - 4 * MIN, endedAtMs: NOW - 4 * MIN }),
        sess({ startedAtMs: NOW - 3 * MIN, lastHeartbeatMs: NOW - 5_000 }),
    ], NOW);
    assert.deepEqual(d, []);
});

test('dropped: older than 15 minutes is not listed', () => {
    assert.deepEqual(findDroppedViewers([sess({ lastHeartbeatMs: NOW - 20 * MIN })], NOW), []);
});

test('dropped: most recent first, minutes added across sessions', () => {
    const d = findDroppedViewers([
        sess({ userId: 'a', lastHeartbeatMs: NOW - 10 * MIN }),
        sess({ userId: 'b', lastHeartbeatMs: NOW - 1 * MIN, watchSeconds: 120 }),
        sess({ userId: 'b', startedAtMs: NOW - 60 * MIN, lastHeartbeatMs: NOW - 40 * MIN, endedAtMs: NOW - 40 * MIN, watchSeconds: 240 }),
    ], NOW);
    assert.deepEqual(d.map(x => x.userId), ['b', 'a']);
    assert.equal(d[0].watchedMinutes, 6);
});

test('pin: shown when fresh, hidden when old, empty or malformed', () => {
    assert.equal(activePin({ text: 'Q&A after!', at: NOW - MIN }, NOW)?.text, 'Q&A after!');
    assert.equal(activePin({ text: 'old', at: NOW - PIN_MAX_AGE_MS - 1 }, NOW), null);
    assert.equal(activePin({ text: '   ', at: NOW }, NOW), null);
    assert.equal(activePin({ text: 'x' }, NOW), null);
    assert.equal(activePin(undefined, NOW), null);
    assert.equal(activePin('hi', NOW), null);
});

test('money split: shared fees come off the top; older tickets keep fees on CRATE; free seats pay no fee; unreported fees are counted', () => {
    const r = splitSales(30, [{ amount: 10, fee: 0.59, shared: true }, { amount: 10, fee: 0.59, shared: true }, { amount: 10, fee: null, shared: true }, { amount: 0, fee: null }], 0.7);
    assert.deepEqual(r, { squareFees: 1.18, feesPending: 1, filmmakerShare: 0.7, filmmakerAmount: 20.17, crateKeeps: 8.65 });
    // Not shared (sold before the cutover): filmmaker keeps 70% of the full price, the fee is CRATE's.
    const old = splitSales(10, [{ amount: 10, fee: 0.59 }], 0.7);
    assert.deepEqual([old.filmmakerAmount, old.crateKeeps], [7, 2.41]);
    assert.equal(splitSales(0, [], 0.7).crateKeeps, 0);
    assert.equal(splitSales(10, [], 5).filmmakerShare, 1);
});
