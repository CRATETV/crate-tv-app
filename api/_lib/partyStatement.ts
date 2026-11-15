// api/_lib/partyStatement.ts — the sales statement CRATE hands a filmmaker after a watch party.
// A plain CSV any spreadsheet opens: a summary at the top, then one line per ticket.
// Buyer emails are NEVER included (those are CRATE's audience, not the filmmaker's).
// Pure, tested in tests/partyStatement.test.ts.

import type { MoneySplit } from './controlRoom.js';

export interface StatementTicket { atMs: number | null; type: 'Ticket' | 'Rental'; amount: number; fee: number | null; promo: boolean }
export interface StatementInput {
    film: string;
    generatedAtMs: number;
    tickets: StatementTicket[];
    split?: MoneySplit;
}

const csv = (v: unknown): string => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (...cells: unknown[]) => cells.map(csv).join(',');
const usd = (n: number) => n.toFixed(2);
const when = (ms: number | null) => ms ? new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function statementFileName(film: string, generatedAtMs: number): string {
    const slug = film.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'film';
    return `crate-tv-sales-${slug}-${new Date(generatedAtMs).toISOString().slice(0, 10)}.csv`;
}

export function buildStatementCsv(input: StatementInput): string {
    const paid = input.tickets.filter(t => t.amount > 0);
    const free = input.tickets.length - paid.length;
    const gross = Math.round(paid.reduce((s, t) => s + t.amount, 0) * 100) / 100;
    const lines: string[] = [
        row('CRATE TV sales statement'),
        row('Film', input.film),
        row('Prepared', when(input.generatedAtMs) + ' (Eastern)'),
        '',
        row('Tickets sold (all)', input.tickets.length),
        row('Paid tickets', paid.length),
        row('Free seats', free),
        row('Buyers paid', usd(gross)),
    ];
    if (input.split) {
        const s = input.split;
        lines.push(row(`Square card fees${s.feesPending > 0 ? ` (${s.feesPending} not reported yet)` : ''}`, usd(-s.squareFees)));
        lines.push(row(`Filmmaker share (${Math.round(s.filmmakerShare * 100)}%)`, usd(s.filmmakerAmount)));
        lines.push(row('CRATE share', usd(s.crateKeeps)));
        lines.push('', row('Note', 'The filmmaker share is worked out after Square card fees for tickets sold from Oct 31, 2026. Fees Square has not reported yet are not included, so the final amount can change slightly.'));
    }
    lines.push('', row('Date and time (Eastern)', 'Type', 'Amount paid', 'Card fee', 'Promo code used'));
    const sorted = [...input.tickets].sort((a, b) => (a.atMs || 0) - (b.atMs || 0));
    for (const t of sorted) {
        lines.push(row(when(t.atMs), t.amount > 0 ? t.type : 'Free seat', usd(t.amount), t.amount > 0 ? (t.fee === null ? 'pending' : usd(t.fee)) : '0.00', t.promo ? 'Yes' : 'No'));
    }
    return lines.join('\r\n') + '\r\n';
}
