// api/_lib/moneyLedger.ts — one line per Square payment, and the proof that the lines add up.
//
// Every dollar that came in is sorted into exactly one of five places:
//   filmmakers  (their share, owed to them)
//   crate       (CRATE's own money)
//   festival    (festival passes and blocks, settled with the festival)
//   partner     (another festival's sales, settled with that festival)
//   cardFees    (Square's fee on a film payment, taken off before the filmmaker/CRATE split)
// so for any set of lines:  gross = filmmakers + crate + festival + partner + cardFees.
// `tieOut` checks that, and the Earnings page shows it as "everything adds up" (or says what is off).
//
// Pure helpers, tested in tests/moneyLedger.test.ts.

export type LedgerKind = 'ticket' | 'rental' | 'donation' | 'festival' | 'partner' | 'held-festival' | 'other';

export interface LedgerLine {
    id: string;
    at: string | null;
    kind: LedgerKind;
    /** What the buyer paid for, in plain words (film title, "Festival pass"...). */
    label: string;
    /** What the buyer paid (after refunds), cents. */
    gross: number;
    filmmakers: number;
    crate: number;
    festival: number;
    partner: number;
    cardFees: number;
    /** Who the filmmaker share is owed to. */
    owedTo: string[];
    /** Set when something about the line needs a person to look at it. */
    flag?: string;
}

export interface TieOut {
    gross: number;
    filmmakers: number;
    crate: number;
    festival: number;
    partner: number;
    cardFees: number;
    /** gross minus the five places. Zero means every cent is accounted for. */
    difference: number;
    balanced: boolean;
    /** Film money CRATE is holding only because no filmmaker is credited on the film yet. */
    heldNoCredit: number;
    lineCount: number;
}

export function tieOut(lines: LedgerLine[]): TieOut {
    const t = { gross: 0, filmmakers: 0, crate: 0, festival: 0, partner: 0, cardFees: 0, heldNoCredit: 0 };
    for (const l of lines) {
        t.gross += l.gross; t.filmmakers += l.filmmakers; t.crate += l.crate;
        t.festival += l.festival; t.partner += l.partner; t.cardFees += l.cardFees;
        if (l.flag === 'no-credit') t.heldNoCredit += l.crate;
    }
    const difference = t.gross - (t.filmmakers + t.crate + t.festival + t.partner + t.cardFees);
    return { ...t, difference, balanced: difference === 0, lineCount: lines.length };
}

/** Philadelphia calendar month of an ISO time, like "2026-11". */
export function phillyMonth(iso?: string | null): string {
    if (!iso) return 'unknown';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'unknown';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(d);
    return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
}

export const linesForMonth = (lines: LedgerLine[], month: string) => lines.filter(l => phillyMonth(l.at) === month);

/** A spreadsheet-friendly copy of the lines (dollars, one row per payment). */
export function ledgerCsv(lines: LedgerLine[]): string {
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const d = (c: number) => (c / 100).toFixed(2);
    const rows = [['Date', 'What', 'Type', 'Paid', 'Filmmakers', 'CRATE', 'Festival', 'Partner', 'Card fees', 'Owed to', 'Note'].join(',')];
    for (const l of [...lines].sort((a, b) => (a.at || '').localeCompare(b.at || ''))) {
        rows.push([q(l.at ? l.at.slice(0, 10) : ''), q(l.label), l.kind, d(l.gross), d(l.filmmakers), d(l.crate), d(l.festival), d(l.partner), d(l.cardFees), q(l.owedTo.join('; ')), q(l.flag || '')].join(','));
    }
    return rows.join('\n');
}
