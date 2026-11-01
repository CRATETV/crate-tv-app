// api/_lib/bookkeeping.ts — pure helpers for the Bookkeeping section of the admin.
//
// One entry = one payment CRATE made (to a filmmaker, a partner festival, or any
// other expense). Amounts are whole cents. Entries are never deleted, only voided
// with a reason, so the record always shows what happened.

export const BOOKKEEPING_COLLECTION = 'bookkeeping_entries';
export const TAX_DOCS_COLLECTION = 'tax_docs';
export const PAYOUT_ENTRY_PREFIX = 'payout_';
/** IRS: send a 1099-NEC to anyone paid this much or more in a year (2026 payments). */
export const FORM_1099_THRESHOLD_CENTS = 200000;
export const W9_LINK = 'https://www.irs.gov/pub/irs-pdf/fw9.pdf';

export type EntryCategory = 'filmmaker' | 'partner' | 'expense' | 'other';
export const CATEGORIES: EntryCategory[] = ['filmmaker', 'partner', 'expense', 'other'];
export type W9Status = 'none' | 'requested' | 'received';

export interface BookkeepingEntry {
    date: string;            // YYYY-MM-DD
    payee: string;
    amountCents: number;
    method: string;
    category: EntryCategory;
    film: string;
    reference: string;       // confirmation number, check number, etc.
    note: string;
    source: 'payout' | 'manual';
    sourceId: string;
    void?: boolean;
    voidReason?: string;
}

const line = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

/** Same person, same key, however the name is typed. */
export const payeeKey = (name: string) => line(name, 120).toLowerCase().replace(/\s+/g, ' ');

/** "12.50", "$1,200" or 1250 (cents, when already a number of cents) → cents, or null if not a positive amount. */
export function dollarsToCents(v: unknown): number | null {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[$,\s]/g, ''));
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
    return Math.round(n * 100);
}

export function cleanEntry(input: any, todayIso: string): { entry?: BookkeepingEntry; error?: string } {
    const payee = line(input?.payee, 120).replace(/\s+/g, ' ');
    if (!payee) return { error: 'Who was paid?' };
    const cents = dollarsToCents(input?.amount);
    if (cents === null) return { error: 'The amount must be more than $0.' };
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.date || '')) ? String(input.date) : todayIso.slice(0, 10);
    if (date > todayIso.slice(0, 10)) return { error: 'The date can’t be in the future.' };
    const category: EntryCategory = CATEGORIES.includes(input?.category) ? input.category : 'other';
    return { entry: { date, payee, amountCents: cents, method: line(input?.method, 40), category, film: line(input?.film, 200), reference: line(input?.reference, 120), note: line(input?.note, 500), source: 'manual', sourceId: '' } };
}

/** The entry that "mark as paid" creates for a filmmaker payout request. */
export function entryFromPayout(requestId: string, req: any, completedIso: string): BookkeepingEntry {
    const films = Array.isArray(req?.filmTitles) ? req.filmTitles.map((t: unknown) => line(t, 100)).filter(Boolean).join(', ') : '';
    return {
        date: completedIso.slice(0, 10),
        payee: line(req?.directorName, 120) || 'Unknown',
        amountCents: Math.round(Number(req?.amount) || 0),
        method: line(req?.payoutMethod, 40),
        category: 'filmmaker',
        film: line(films, 200),
        reference: '',
        note: '',
        source: 'payout',
        sourceId: requestId,
    };
}

export interface PayeeTotal { key: string; payee: string; totalCents: number; count: number; needs1099: boolean }

/** Totals per person for one calendar year (voided entries and plain expenses left out — those aren't 1099 payments). */
export function totalsByPayee(entries: (BookkeepingEntry & { void?: boolean })[], year: number): PayeeTotal[] {
    const map = new Map<string, PayeeTotal>();
    for (const e of entries) {
        if (e.void || e.category === 'expense' || !e.date.startsWith(String(year))) continue;
        const key = payeeKey(e.payee);
        const row = map.get(key) || { key, payee: e.payee, totalCents: 0, count: 0, needs1099: false };
        row.totalCents += e.amountCents; row.count += 1;
        row.needs1099 = row.totalCents >= FORM_1099_THRESHOLD_CENTS;
        map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}

const csvCell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;          // stop spreadsheet formulas
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function entriesToCsv(entries: (BookkeepingEntry & { void?: boolean; voidReason?: string })[]): string {
    const head = ['Date', 'Paid to', 'Amount (USD)', 'Method', 'Type', 'Film', 'Reference', 'Note', 'Status'];
    const rows = entries.map(e => [e.date, e.payee, (e.amountCents / 100).toFixed(2), e.method, e.category, e.film, e.reference, e.note, e.void ? `Voided: ${e.voidReason || ''}` : 'Paid']);
    return [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
}
