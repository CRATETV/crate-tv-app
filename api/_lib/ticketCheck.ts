// api/_lib/ticketCheck.ts — the "numbers check" on Earnings & Payouts.
//
// Two different records describe the same watch party ticket money:
//   • our own ticket records (festival_tickets): what the Control Room's "Tickets for this party" shows
//   • Square's payments: what "Who you owe" is built from
// They should agree film by film. When they don't, something is being left out or double counted,
// and paying a filmmaker from either number could be wrong. (Nov 14 2026: the party showed $77.27 for
// Aliya while Who you owe showed $15.93, because pay-what-you-want tickets were not being read.)
//
// This compares the two per film and says exactly what is off. Pure, tested in tests/ticketCheck.test.ts.

import { watchPartyTicketFilm } from './ticketNote.js';

export interface TicketRecordLike { itemId?: unknown; paymentType?: unknown; amountPaid?: unknown; squarePaymentId?: unknown }
export interface PaymentLike { id?: string; amount_money: { amount: number }; note?: string }
export interface FilmLike { key: string; title?: string }

export interface FilmTicketCheck {
    key: string;
    title: string;
    /** Paid tickets in our records / their dollars (cents). */
    recordedCount: number;
    recordedCents: number;
    /** Ticket payments Square has for this film / their dollars (cents), after refunds. */
    squareCount: number;
    squareCents: number;
    /** recorded minus Square, cents. Positive = our records show more money than Square. */
    differenceCents: number;
    /** Paid tickets in our records whose Square payment is not in Square's list. */
    recordsWithoutPayment: number;
    /** Square ticket payments for this film that no ticket record points to. */
    paymentsWithoutRecord: number;
    matches: boolean;
}

export interface TicketCheckResult {
    ok: boolean;
    films: FilmTicketCheck[];            // only films with a problem, biggest difference first
    checkedFilms: number;
}

/** Differences under this many cents are rounding or a partial refund, not a problem. */
export const TOLERANCE_CENTS = 50;

const cents = (dollars: unknown): number => {
    const n = Number(dollars);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

export function checkTicketsAgainstSquare(records: TicketRecordLike[], payments: PaymentLike[], movies: FilmLike[]): TicketCheckResult {
    const byKey = new Map(movies.map(m => [m.key, m]));
    const byTitle = new Map(movies.map(m => [(m.title || '').trim(), m]));

    type Acc = { recordedCount: number; recordedCents: number; squareCount: number; squareCents: number; recordIds: Set<string>; recordNoId: number; paymentIds: Set<string> };
    const acc = new Map<string, Acc>();
    const get = (key: string): Acc => {
        let a = acc.get(key);
        if (!a) { a = { recordedCount: 0, recordedCents: 0, squareCount: 0, squareCents: 0, recordIds: new Set(), recordNoId: 0, paymentIds: new Set() }; acc.set(key, a); }
        return a;
    };

    // Square's side: ticket payments, matched to a film by the title on the note.
    const squareIdsByFilm = new Map<string, Set<string>>();
    for (const p of payments) {
        const title = watchPartyTicketFilm(p.note);
        if (title === null) continue;
        const movie = byTitle.get(title);
        if (!movie) continue;                       // a block or unknown title: not one film's ticket
        const a = get(movie.key);
        a.squareCount++;
        a.squareCents += p.amount_money.amount;
        if (p.id) a.paymentIds.add(p.id);
        if (p.id) { if (!squareIdsByFilm.has(movie.key)) squareIdsByFilm.set(movie.key, new Set()); squareIdsByFilm.get(movie.key)!.add(p.id); }
    }

    // Our side: paid watch party ticket records for a real film.
    for (const r of records) {
        if (r.paymentType !== 'watchPartyTicket') continue;
        const key = typeof r.itemId === 'string' ? r.itemId : '';
        if (!byKey.has(key)) continue;              // a festival block or deleted film
        const c = cents(r.amountPaid);
        if (c <= 0) continue;                       // free seats (cast/crew, promo) carry no money
        const a = get(key);
        a.recordedCount++;
        a.recordedCents += c;
        const id = typeof r.squarePaymentId === 'string' ? r.squarePaymentId : '';
        if (id) a.recordIds.add(id); else a.recordNoId++;
    }

    const films: FilmTicketCheck[] = [];
    for (const [key, a] of acc) {
        const movie = byKey.get(key)!;
        const recordsWithoutPayment = [...a.recordIds].filter(id => !a.paymentIds.has(id)).length + a.recordNoId;
        const paymentsWithoutRecord = [...a.paymentIds].filter(id => !a.recordIds.has(id)).length;
        const differenceCents = a.recordedCents - a.squareCents;
        const matches = Math.abs(differenceCents) <= TOLERANCE_CENTS && recordsWithoutPayment === 0 && paymentsWithoutRecord === 0;
        films.push({
            key, title: (movie.title || '').trim() || key,
            recordedCount: a.recordedCount, recordedCents: a.recordedCents,
            squareCount: a.squareCount, squareCents: a.squareCents,
            differenceCents, recordsWithoutPayment, paymentsWithoutRecord, matches,
        });
    }
    const problems = films.filter(f => !f.matches).sort((x, y) => Math.abs(y.differenceCents) - Math.abs(x.differenceCents));
    return { ok: problems.length === 0, films: problems, checkedFilms: films.length };
}
