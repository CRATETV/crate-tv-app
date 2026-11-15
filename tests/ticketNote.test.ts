// Reading the note on a watch party ticket payment. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchPartyTicketFilm } from '../api/_lib/ticketNote.js';
import { parseNote } from '../api/_lib/filmmakerBalance.js';
import { describePayment } from '../api/_lib/recentPayments.js';

const FILM = "You Don't Know My Name";

test('every ticket note names its film (pay-what-you-want was missed before Nov 14 2026)', () => {
    assert.equal(watchPartyTicketFilm(`Watch Party Ticket: ${FILM}`), FILM);
    assert.equal(watchPartyTicketFilm(`Watch Party Ticket (pay what you want): ${FILM}`), FILM);
    assert.equal(watchPartyTicketFilm(`Watch Party Ticket (guest code): ${FILM}`), FILM);
    assert.equal(watchPartyTicketFilm(`Live Screening Pass: ${FILM}`), FILM);
});

test('block tickets and other payments are not film tickets', () => {
    assert.equal(watchPartyTicketFilm('Watch Party Ticket (Block): Sun Shorts'), null);
    assert.equal(watchPartyTicketFilm('VOD Rental: Hard Times'), null);
    assert.equal(watchPartyTicketFilm('Crate TV Purchase'), null);
    assert.equal(watchPartyTicketFilm(undefined), null);
});

test('earnings counts a pay-what-you-want ticket toward the film', () => {
    assert.deepEqual(parseNote(`Watch Party Ticket (pay what you want): ${FILM}`), { type: 'watchPartyTicket', title: FILM });
    assert.deepEqual(parseNote(`Watch Party Ticket: ${FILM}`), { type: 'watchPartyTicket', title: FILM });
});

test('the money-in card names a pay-what-you-want ticket as a ticket', () => {
    assert.deepEqual(describePayment(`Watch Party Ticket (pay what you want): ${FILM}`), { what: 'Ticket', film: FILM });
});
