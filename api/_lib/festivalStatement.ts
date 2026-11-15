// api/_lib/festivalStatement.ts — the printable settlement statement for a partner festival.
// Same look as the film sales statement (CRATE TV watermark; Print → Save as PDF).
// No buyer emails. Pure, tested in tests/festivalStatement.test.ts.

export interface FestivalStatementInput {
    festival: string;
    payee: string;
    generatedAtMs: number;
    lines: { label: string; orders: number; gross: number }[];
    totals: { orders: number; gross: number };
    payout: { gross: number; deductions: number; squareFees: number; net: number; crateSharePct: number; crateAmount: number; partnerAmount: number };
    deductionsNote?: string;
    paid?: { amount: number; atMs: number | null; note?: string } | null;
    feesPending?: number;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const usd = (n: number) => '$' + (Math.round(n * 100) / 100).toFixed(2);
const when = (ms: number | null) => ms ? new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function buildFestivalStatementHtml(i: FestivalStatementInput): string {
    const p = i.payout;
    const sum: [string, string, boolean?][] = [
        ['Ticket sales (gross)', usd(p.gross)],
    ];
    if (p.deductions > 0) sum.push([`Deductions${i.deductionsNote ? ` (${i.deductionsNote})` : ''}`, '−' + usd(p.deductions)]);
    if (p.squareFees > 0) sum.push(['Square card fees', '−' + usd(p.squareFees)]);
    sum.push(['Net to split', usd(p.net)]);
    sum.push([`CRATE share (${p.crateSharePct}%)`, usd(p.crateAmount)]);
    sum.push([`${i.payee} receives`, usd(p.partnerAmount), true]);
    if (i.paid) sum.push([`Paid${i.paid.atMs ? ' on ' + when(i.paid.atMs) : ''}${i.paid.note ? ' — ' + i.paid.note : ''}`, usd(i.paid.amount)]);
    else sum.push(['Status', 'Not paid yet']);
    const rows = i.lines.map(l => `<tr><td>${esc(l.label)}</td><td class="n">${l.orders}</td><td class="n">${usd(l.gross)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>CRATE TV festival statement: ${esc(i.festival)}</title>
<style>
body{font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1f;margin:0;padding:40px 48px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#666;margin:0 0 24px}
table{border-collapse:collapse;width:100%;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e3e3e8}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666}
.n{text-align:right;font-variant-numeric:tabular-nums}.sum{max-width:520px}.sum td:last-child{text-align:right;font-weight:700}.hi td{background:#f3faf5}
.note{color:#666;font-size:12px;margin-top:16px;max-width:640px}
.wm{position:fixed;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:120px;font-weight:900;letter-spacing:.08em;color:rgba(214,40,57,.09);white-space:nowrap;pointer-events:none;z-index:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.content{position:relative;z-index:1}.btn{margin-bottom:20px;padding:10px 16px;font-weight:700;border:0;border-radius:8px;background:#d62839;color:#fff;cursor:pointer}
@media print{.btn{display:none}body{padding:0}}
</style></head><body><div class="wm">CRATE TV</div><div class="content">
<button class="btn" onclick="window.print()">Print or save as PDF</button>
<h1>CRATE TV festival statement</h1><p class="sub">${esc(i.festival)} · prepared for ${esc(i.payee)} · ${esc(when(i.generatedAtMs))} (Eastern)</p>
<table class="sum">${sum.map(([k, v, hi]) => `<tr${hi ? ' class="hi"' : ''}><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
${i.feesPending ? `<p class="note">${i.feesPending} recent sale${i.feesPending === 1 ? '' : 's'} not yet reported by Square, so the card fee total can change slightly.</p>` : ''}
<table><thead><tr><th>Item</th><th class="n">Orders</th><th class="n">Sales</th></tr></thead><tbody>${rows}<tr><td><strong>Total</strong></td><td class="n"><strong>${i.totals.orders}</strong></td><td class="n"><strong>${usd(i.totals.gross)}</strong></td></tr></tbody></table>
</div></body></html>`;
}
