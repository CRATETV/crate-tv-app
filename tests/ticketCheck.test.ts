// The numbers check: our ticket records vs Square, film by film. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTicketsAgainstSquare, TOLERANCE_CENTS } from '../api/_lib/ticketCheck.js';

const movies = [{ key: 'ydkmn', title: "You Don't Know My Name" }, { key: 'other', title: 'Other Film' }];
const pay = (id: string, cents: number, note: string) => ({ id, amount_money: { amount: cents }, note });
const rec = (itemId: string, amountPaid: number, squarePaymentId?: string, paymentType = 'watchPartyTicket') => ({ itemId, paymentType, amountPaid, squarePaymentId });

test('agrees when every paid ticket has its Square payment', () => {
    const payments = [pay('a', 499, "Watch Party Ticket: You Don't Know My Name"), pay('b', 300, "Watch Party Ticket (pay what you want): You Don't Know My Name")];
    const records = [rec('ydkmn', 4.99, 'a'), rec('ydkmn', 3, 'b')];
    const r = checkTicketsAgainstSquare(records, payments, movies);
    assert.equal(r.ok, true);
    assert.equal(r.films.length, 0);
    assert.equal(r.checkedFilms, 1);
});

test('free seats and block tickets never count', () => {
    const payments = [pay('a', 499, "Watch Party Ticket: You Don't Know My Name"), pay('blk', 1000, 'Watch Party Ticket (Block): Sun Shorts')];
    const records = [rec('ydkmn', 4.99, 'a'), rec('ydkmn', 0, undefined), rec('some-block-id', 10, 'blk')];
    assert.equal(checkTicketsAgainstSquare(records, payments, movies).ok, true);
});

test('flags a film whose records show more than Square (the Nov 14 2026 case, before the fix)', () => {
    // Square payments are all there, but only the plain-note ones would have been read before the fix.
    const payments = [pay('a', 499, "Watch Party Ticket: You Don't Know My Name")];
    const records = [rec('ydkmn', 4.99, 'a'), rec('ydkmn', 4.99, 'b'), rec('ydkmn', 4.99, 'c')];
    const r = checkTicketsAgainstSquare(records, payments, movies);
    assert.equal(r.ok, false);
    assert.equal(r.films[0].title, "You Don't Know My Name");
    assert.equal(r.films[0].differenceCents, 998);
    assert.equal(r.films[0].recordsWithoutPayment, 2);
});

test('flags a Square payment that no ticket record points to', () => {
    const payments = [pay('a', 499, "Watch Party Ticket: You Don't Know My Name"), pay('z', 499, "Watch Party Ticket: You Don't Know My Name")];
    const r = checkTicketsAgainstSquare([rec('ydkmn', 4.99, 'a')], payments, movies);
    assert.equal(r.ok, false);
    assert.equal(r.films[0].paymentsWithoutRecord, 1);
});

test('a tiny rounding gap alone is not a problem', () => {
    const payments = [pay('a', 499 - 10, "Watch Party Ticket: You Don't Know My Name")];
    const r = checkTicketsAgainstSquare([rec('ydkmn', 4.99, 'a')], payments, movies);
    assert.ok(Math.abs(r.films.length ? r.films[0].differenceCents : 0) <= TOLERANCE_CENTS);
    assert.equal(r.ok, true);
});

test('biggest difference is listed first', () => {
    const payments = [pay('a', 499, "Watch Party Ticket: You Don't Know My Name"), pay('c', 499, 'Watch Party Ticket: Other Film')];
    const records = [rec('ydkmn', 4.99, 'a'), rec('ydkmn', 4.99, 'x'), rec('other', 4.99, 'c'), rec('other', 4.99, 'y'), rec('other', 4.99, 'w'), rec('other', 4.99, 'v')];
    const r = checkTicketsAgainstSquare(records, payments, movies);
    assert.equal(r.films[0].title, 'Other Film');
    assert.equal(r.films[1].title, "You Don't Know My Name");
});
