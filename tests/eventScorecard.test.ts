// Event scorecard: tickets sold, new people, cost to run. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScorecard, personKey } from '../api/_lib/eventScorecard.js';

const films = [{ key: 'ydkmn', title: "You Don't Know My Name", crateCents: 3312 }, { key: 'next', title: 'Next Film', crateCents: 500 }];
const t = (itemId: string, who: { uid?: string; email?: string }, amountPaid: number, ms: number, paymentType = 'watchPartyTicket') => ({ itemId, paymentType, amountPaid, purchasedAtMs: ms, ...who });

test('counts seats, paid and free', () => {
    const r = buildScorecard([t('ydkmn', { uid: 'a' }, 4.99, 1), t('ydkmn', { uid: 'b' }, 0, 2), t('ydkmn', { uid: 'c' }, 3, 3)], films, {});
    assert.equal(r.length, 1);
    assert.equal(r[0].ticketsSold, 3);
    assert.equal(r[0].paidTickets, 2);
    assert.equal(r[0].freeSeats, 1);
    assert.equal(r[0].paidCents, 799);
});

test('new people are those whose first ticket ever was this event', () => {
    const records = [
        t('older', { uid: 'x' }, 5, 1, 'block'),               // x bought a festival block earlier
        t('ydkmn', { uid: 'x' }, 4.99, 10),                     // returning
        t('ydkmn', { uid: 'y' }, 4.99, 11),                     // new
        t('ydkmn', { email: 'Z@Mail.com' }, 4.99, 12),          // new (by email)
    ];
    const r = buildScorecard(records, films, {});
    assert.equal(r[0].newPeople, 2);
    assert.equal(r[0].returningPeople, 1);
});

test('someone who attends a second event is returning there', () => {
    const records = [t('ydkmn', { uid: 'a' }, 5, 1), t('next', { uid: 'a' }, 5, 100), t('next', { uid: 'b' }, 5, 101)];
    const next = buildScorecard(records, films, {}).find(e => e.key === 'next')!;
    assert.equal(next.newPeople, 1);
    assert.equal(next.returningPeople, 1);
});

test('same person by email in different case is one person', () => {
    assert.equal(personKey({ email: 'A@B.com' }), personKey({ email: ' a@b.COM ' }));
    assert.equal(personKey({}), '');
});

test('net needs a cost; until then it is null', () => {
    const r1 = buildScorecard([t('ydkmn', { uid: 'a' }, 5, 1)], films, {});
    assert.equal(r1[0].costCents, null);
    assert.equal(r1[0].netCents, null);
    const r2 = buildScorecard([t('ydkmn', { uid: 'a' }, 5, 1)], films, { ydkmn: 2000 });
    assert.equal(r2[0].costCents, 2000);
    assert.equal(r2[0].netCents, 3312 - 2000);
});

test('festival blocks and deleted films are not events', () => {
    const r = buildScorecard([t('some-block', { uid: 'a' }, 10, 1), t('gone', { uid: 'a' }, 5, 2), t('ydkmn', { uid: 'b' }, 5, 3, 'movie')], films, {});
    assert.equal(r.length, 0);
});

test('most recent event first', () => {
    const r = buildScorecard([t('ydkmn', { uid: 'a' }, 5, 10), t('next', { uid: 'b' }, 5, 99)], films, {});
    assert.deepEqual(r.map(e => e.key), ['next', 'ydkmn']);
});
