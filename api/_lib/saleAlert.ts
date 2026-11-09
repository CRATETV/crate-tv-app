// The "you got paid" email. Pure helpers so the wording and the recipient list are tested
// (tests/saleAlert.test.ts). The email is a backup for Square's own notification.
import { describePayment } from './recentPayments.js';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Everyone who should hear about a sale: the technical email plus every owner, no duplicates. */
export function saleAlertRecipients(technicalEmail: string | undefined, owners: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of [technicalEmail || '', ...owners]) {
        const e = raw.trim();
        if (e && !seen.has(e.toLowerCase())) { seen.add(e.toLowerCase()); out.push(e); }
    }
    return out;
}

/** Free tickets (promo or guest code) are not money, so they get no alert. */
export const shouldAlertSale = (cents: number) => Number.isFinite(cents) && cents > 0;

/** "💰 Tip: You Don't Know My Name — $5.00" */
export function saleAlertSubject(note: string, cents: number): string {
    const { what, film } = describePayment(note);
    return `💰 ${what}${film ? `: ${film}` : ''} — ${money(cents)}`.replace(/[\r\n]/g, ' ').slice(0, 150);
}
