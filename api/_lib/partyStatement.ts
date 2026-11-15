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

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** The same statement as a clean one-page-style document with a CRATE TV watermark. Open it and choose Print → Save as PDF. */
export function buildStatementHtml(input: StatementInput): string {
    const paid = input.tickets.filter(t => t.amount > 0);
    const free = input.tickets.length - paid.length;
    const gross = Math.round(paid.reduce((s, t) => s + t.amount, 0) * 100) / 100;
    const sorted = [...input.tickets].sort((a, b) => (a.atMs || 0) - (b.atMs || 0));
    const sum: [string, string][] = [
        ['Tickets sold (all)', String(input.tickets.length)], ['Paid tickets', String(paid.length)], ['Free seats', String(free)], ['Buyers paid', '$' + usd(gross)],
    ];
    if (input.split) {
        const sp = input.split;
        sum.push([`Square card fees${sp.feesPending > 0 ? ` (${sp.feesPending} not reported yet)` : ''}`, '−$' + usd(sp.squareFees)]);
        sum.push([`Filmmaker share (${Math.round(sp.filmmakerShare * 100)}%)`, '$' + usd(sp.filmmakerAmount)]);
        sum.push(['CRATE share', '$' + usd(sp.crateKeeps)]);
    }
    const rows = sorted.map(t => `<tr><td>${esc(when(t.atMs))}</td><td>${esc(t.amount > 0 ? t.type : 'Free seat')}</td><td class="n">$${usd(t.amount)}</td><td class="n">${t.amount > 0 ? (t.fee === null ? 'pending' : '$' + usd(t.fee)) : '$0.00'}</td><td>${t.promo ? 'Yes' : 'No'}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>CRATE TV sales statement: ${esc(input.film)}</title>
<style>
body{font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1f;margin:0;padding:40px 48px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#666;margin:0 0 24px}
table{border-collapse:collapse;width:100%;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e3e3e8}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666}
.n{text-align:right;font-variant-numeric:tabular-nums}.sum{max-width:420px}.sum td:last-child{text-align:right;font-weight:700}
.note{color:#666;font-size:12px;margin-top:16px;max-width:640px}
.wm{position:fixed;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:120px;font-weight:900;letter-spacing:.08em;color:rgba(214,40,57,.09);white-space:nowrap;pointer-events:none;z-index:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.content{position:relative;z-index:1}.btn{margin-bottom:20px;padding:10px 16px;font-weight:700;border:0;border-radius:8px;background:#d62839;color:#fff;cursor:pointer}
@media print{.btn{display:none}body{padding:0}}
</style></head><body><div class="wm">CRATE TV</div><div class="content">
<button class="btn" onclick="window.print()">Print or save as PDF</button>
<h1>CRATE TV sales statement</h1><p class="sub">${esc(input.film)} · prepared ${esc(when(input.generatedAtMs))} (Eastern)</p>
<table class="sum">${sum.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
${input.split ? '<p class="note">The filmmaker share is worked out after Square card fees for tickets sold from Oct 31, 2026. Fees Square has not reported yet are not included, so the final amount can change slightly.</p>' : ''}
<table><thead><tr><th>Date and time (Eastern)</th><th>Type</th><th class="n">Amount paid</th><th class="n">Card fee</th><th>Promo code used</th></tr></thead><tbody>${rows}</tbody></table>
</div></body></html>`;
}
