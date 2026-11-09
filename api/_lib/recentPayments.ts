// "Money coming in" card (dashboard). Turns Square payments into short lines like
// "Ticket · You Don't Know My Name · $3.00" and counts which ones arrived since
// the owner last pressed "Got it". Pure and tested: tests/recentPayments.test.ts.

export interface PaymentRow { id: string; createdAt: string; status?: string; amount: number; refunded?: number; note?: string }
export interface PaymentLine { id: string; at: string; what: string; film: string; cents: number; isNew: boolean }

/** "Watch Party Ticket: Neighbors" -> { what: 'Ticket', film: 'Neighbors' } */
export function describePayment(note: string | undefined): { what: string; film: string } {
    const n = (note || '').trim();
    let m: RegExpMatchArray | null;
    if ((m = n.match(/^(?:Watch Party Ticket|Live Screening Pass)(?: \(Block\))?: (.*)$/))) return { what: n.includes('(Block)') ? 'Block ticket' : 'Ticket', film: m[1].trim() };
    if ((m = n.match(/^Support for film: "(.*)"$/))) return { what: 'Tip', film: m[1].trim() };
    if ((m = n.match(/^VOD Rental: (.*)$/))) return { what: 'Rental', film: m[1].trim() };
    if ((m = n.match(/^Unlock Block: (.*)$/))) return { what: 'Block ticket', film: m[1].trim() };
    if (/All-Access Pass/i.test(n)) return { what: 'Festival pass', film: '' };
    return { what: 'Payment', film: n.replace(/^Crate TV Purchase$/i, '') };
}

export function recentPayments(rows: PaymentRow[], lastSeenMs: number, limit = 8): { lines: PaymentLine[]; newCount: number; newCents: number } {
    const lines = rows
        .filter(r => r.status === 'COMPLETED' && (r.amount - (r.refunded || 0)) > 0)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(r => ({ id: r.id, at: r.createdAt, ...describePayment(r.note), cents: r.amount - (r.refunded || 0), isNew: Date.parse(r.createdAt) > lastSeenMs }));
    const fresh = lines.filter(l => l.isNew);
    return { lines: lines.slice(0, limit), newCount: fresh.length, newCents: fresh.reduce((s, l) => s + l.cents, 0) };
}
