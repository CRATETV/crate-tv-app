// api/_lib/eventScorecard.ts — three numbers for every event.
//
//   1. Tickets sold     — how many seats were taken (paid + free cast/crew/promo seats)
//   2. New people       — buyers whose very first ticket with CRATE was for this event
//   3. Cost to run      — what you spent to put it on (entered by you, per event)
// plus what CRATE kept and the net after cost, so an event reads as "did it pay for itself?".
//
// An "event" is one film's watch party. Festival block tickets are not counted here.
// A person is identified by their account (uid) when there is one, otherwise their lowercased email.
// Pure and tested in tests/eventScorecard.test.ts.

export interface ScoreTicketRecord {
    itemId?: unknown; paymentType?: unknown; amountPaid?: unknown;
    uid?: unknown; email?: unknown; purchasedAtMs?: number | null;
}
export interface ScoreFilm { key: string; title: string; crateCents: number }

export interface EventScore {
    key: string;
    title: string;
    ticketsSold: number;
    paidTickets: number;
    freeSeats: number;
    newPeople: number;
    returningPeople: number;
    /** Dollars buyers paid, cents. */
    paidCents: number;
    /** What CRATE kept after card fees and the filmmaker's share, cents. */
    crateKeepsCents: number;
    /** What you spent running it, cents; null until you enter it. */
    costCents: number | null;
    /** crateKeeps minus cost; null until a cost is entered. */
    netCents: number | null;
    lastTicketMs: number | null;
    /** What you wrote about the cost (added by the API). */
    costNote?: string;
}

/** Who a ticket belongs to. Empty string = can't tell (never counted as a person). */
export function personKey(r: Pick<ScoreTicketRecord, 'uid' | 'email'>): string {
    if (typeof r.uid === 'string' && r.uid.trim()) return `u:${r.uid.trim()}`;
    if (typeof r.email === 'string' && r.email.trim()) return `e:${r.email.trim().toLowerCase()}`;
    return '';
}

const cents = (dollars: unknown): number => {
    const n = Number(dollars);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

export function buildScorecard(records: ScoreTicketRecord[], films: ScoreFilm[], costs: Record<string, number | undefined>): EventScore[] {
    const filmByKey = new Map(films.map(f => [f.key, f]));

    // Each person's first-ever ticket (any kind), so "new" means new to CRATE, not new to this film.
    const firstByPerson = new Map<string, { ms: number; itemId: string }>();
    for (const r of records) {
        const p = personKey(r);
        if (!p) continue;
        const ms = typeof r.purchasedAtMs === 'number' ? r.purchasedAtMs : Number.MAX_SAFE_INTEGER;
        const itemId = typeof r.itemId === 'string' ? r.itemId : '';
        const cur = firstByPerson.get(p);
        if (!cur || ms < cur.ms) firstByPerson.set(p, { ms, itemId });
    }

    const byFilm = new Map<string, { sold: number; paid: number; paidCents: number; people: Set<string>; last: number | null }>();
    for (const r of records) {
        if (r.paymentType !== 'watchPartyTicket') continue;
        const key = typeof r.itemId === 'string' ? r.itemId : '';
        if (!filmByKey.has(key)) continue;          // a festival block or a deleted film
        let a = byFilm.get(key);
        if (!a) { a = { sold: 0, paid: 0, paidCents: 0, people: new Set(), last: null }; byFilm.set(key, a); }
        a.sold++;
        const c = cents(r.amountPaid);
        if (c > 0) { a.paid++; a.paidCents += c; }
        const p = personKey(r);
        if (p) a.people.add(p);
        if (typeof r.purchasedAtMs === 'number' && (a.last === null || r.purchasedAtMs > a.last)) a.last = r.purchasedAtMs;
    }

    const out: EventScore[] = [];
    for (const [key, a] of byFilm) {
        const film = filmByKey.get(key)!;
        let fresh = 0;
        for (const p of a.people) if (firstByPerson.get(p)?.itemId === key) fresh++;
        const cost = costs[key];
        const costCents = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? Math.round(cost) : null;
        out.push({
            key, title: film.title,
            ticketsSold: a.sold, paidTickets: a.paid, freeSeats: a.sold - a.paid,
            newPeople: fresh, returningPeople: a.people.size - fresh,
            paidCents: a.paidCents, crateKeepsCents: film.crateCents,
            costCents, netCents: costCents === null ? null : film.crateCents - costCents,
            lastTicketMs: a.last,
        });
    }
    return out.sort((x, y) => (y.lastTicketMs || 0) - (x.lastTicketMs || 0));
}
