// api/_lib/ticketNote.ts — reading the note on a watch party ticket payment.
//
// api/process-square-payment.ts writes one of these notes on every ticket:
//   Watch Party Ticket: <film>                      (normal price)
//   Watch Party Ticket (pay what you want): <film>  (pay-what-you-want film)
//   Watch Party Ticket (guest code): <film>         (free cast/crew seat on a pay-what-you-want film)
//   Live Screening Pass: <film>                     (older notes)
// The money screens used to match only the first and last, so every pay-what-you-want
// ticket was left out of the filmmaker's earnings (Nov 14 2026: Aliya's "Who you owe"
// showed $15.93 while the watch party showed $77.27). One shared rule, tested in
// tests/ticketNote.test.ts.
//
// "Watch Party Ticket (Block): <block>" is deliberately NOT here: a block ticket is a
// festival ticket, not a ticket for one film.

/** The film a watch party ticket payment was for, or null when the note is not a film ticket. */
export function watchPartyTicketFilm(note: string | undefined | null): string | null {
    const n = String(note || '');
    const m = n.match(/Watch Party Ticket(?: \((?:pay what you want|guest code)\))?: (.*)/) || n.match(/Live Screening Pass: (.*)/);
    return m ? m[1].trim() : null;
}
