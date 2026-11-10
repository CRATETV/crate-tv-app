import React, { useEffect, useState } from 'react';
import { Card, Button, Notice, Pill, SectionTitle, adminPost, money } from './ui';
import { LedgerLine, TieOut, ledgerCsv } from '../../api/_lib/moneyLedger';

// Month ledger — every payment in a month, where each cent went, and proof it adds up.
// Data: /api/admin-earnings { action: 'month-ledger', month }. Numbers come from the same
// rules as the rest of this page, so nothing here can disagree with the totals above.

const KIND: Record<string, string> = { ticket: 'Watch party ticket', rental: 'Rental', donation: 'Tip', festival: 'Festival', partner: 'Partner festival', 'held-festival': 'Festival film rental (held)', other: 'Other (passes, subscriptions…)' };
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const c = (cents: number) => money(cents);

const MonthLedger: React.FC<{ months: string[]; tieOuts: Record<string, TieOut> }> = ({ months, tieOuts }) => {
    const list = [...months].sort().reverse();
    const [month, setMonth] = useState(list[0] || '');
    const [lines, setLines] = useState<LedgerLine[] | null>(null);
    const [tie, setTie] = useState<TieOut | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (!month) return;
        let live = true;
        setLines(null); setErr(null); setShowAll(false);
        adminPost<any>('/api/admin-earnings', { action: 'month-ledger', month })
            .then(d => { if (!live) return; setLines(d.ledger || []); setTie(d.monthTieOuts?.[month] || null); })
            .catch(e => live && setErr((e as Error).message || "Couldn't load this month."));
        return () => { live = false; };
    }, [month]);

    const t = tie || tieOuts[month] || null;
    const download = () => {
        if (!lines) return;
        const blob = new Blob([ledgerCsv(lines)], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `crate-tv-money-${month}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    if (!list.length) return null;
    const shown = lines ? (showAll ? lines : lines.slice(0, 15)) : [];

    return (
        <Card>
            <SectionTitle title="Month ledger" hint="Every payment in a month and where each cent went. The check at the top proves the month adds up." />
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select value={month} onChange={e => setMonth(e.target.value)} className="rounded-xl bg-[#131318] border border-white/[0.07] px-3 py-2 text-sm text-white">
                    {list.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
                <Button size="sm" onClick={download} disabled={!lines || !lines.length}>⬇ Download for a spreadsheet</Button>
            </div>
            {err && <Notice tone="warn">{err}</Notice>}
            {t && (
                <div className="space-y-4">
                    {t.balanced
                        ? <Notice tone="success">✓ {monthName(month)} adds up. {c(t.gross)} came in and every cent is accounted for below ({t.lineCount} payments).</Notice>
                        : <Notice tone="error">✗ {monthName(month)} is off by {c(Math.abs(t.difference))}. {c(t.gross)} came in but the pieces below don't add up to it. Please tell your assistant, with this month's name.</Notice>}
                    {t.heldNoCredit > 0 && <Notice tone="warn">{c(t.heldNoCredit)} this month is sitting with CRATE only because a film has no filmmaker credited yet. Add the credit and it moves to the filmmaker.</Notice>}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {([
                            ['Came in (paid by viewers)', t.gross, 'Real payments only; refunds are taken back out'],
                            ['Filmmakers’ share (you owe)', t.filmmakers, 'Their cut of films, before any payouts you sent'],
                            ['CRATE’s share', t.crate, 'Your cut of films, plus passes & other'],
                            ['Festivals', t.festival, 'Passes and blocks, settled with the festival'],
                            ['Partner festivals', t.partner, 'Settled with each partner'],
                            ['Card fees shared', t.cardFees, 'Square’s fee on film payments, taken off before the split'],
                        ] as const).map(([label, v, hint]) => (
                            <div key={label} className="rounded-2xl bg-white/[0.03] p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A96]">{label}</p>
                                <p className="text-xl font-black text-white mt-1">{c(v)}</p>
                                <p className="text-xs text-[#8A8A96] mt-1">{hint}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-[#8A8A96]">Filmmakers + CRATE + festivals + partners + card fees = came in.</p>
                </div>
            )}
            <div className="mt-6">
                {lines === null && !err && <p className="text-sm text-[#8A8A96]">Loading the payments…</p>}
                {lines && lines.length === 0 && <p className="text-sm text-[#8A8A96]">No payments in {monthName(month)}.</p>}
                {lines && lines.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8A8A96]">
                                <th className="py-2 pr-3">Date</th><th className="pr-3">What</th><th className="pr-3 text-right">Paid</th><th className="pr-3 text-right">Filmmakers</th><th className="pr-3 text-right">CRATE</th><th className="text-right">Other</th>
                            </tr></thead>
                            <tbody>
                                {shown.map((l, i) => (
                                    <tr key={l.id + i} className="border-t border-white/[0.05] align-top">
                                        <td className="py-2 pr-3 whitespace-nowrap text-[#A1A1AD]">{l.at ? new Date(l.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : '—'}</td>
                                        <td className="pr-3 text-white">
                                            <span className="font-semibold">{l.label}</span>
                                            <span className="block text-xs text-[#8A8A96]">{KIND[l.kind] || l.kind}{l.owedTo.length ? ` · owed to ${l.owedTo.join(', ')}` : ''}</span>
                                            {l.flag === 'no-credit' && <Pill accent="amber">No filmmaker credited</Pill>}
                                            {l.flag === 'film-not-found' && <Pill accent="amber">Film not found</Pill>}
                                        </td>
                                        <td className="pr-3 text-right text-white font-semibold">{c(l.gross)}</td>
                                        <td className="pr-3 text-right text-[#A1A1AD]">{l.filmmakers ? c(l.filmmakers) : '—'}</td>
                                        <td className="pr-3 text-right text-[#A1A1AD]">{l.crate ? c(l.crate) : '—'}</td>
                                        <td className="text-right text-[#A1A1AD]">{(l.festival + l.partner + l.cardFees) ? c(l.festival + l.partner + l.cardFees) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {lines.length > 15 && <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-bold text-white/80 underline">{showAll ? 'Show fewer' : `Show all ${lines.length} payments`}</button>}
                    </div>
                )}
            </div>
        </Card>
    );
};
export default MonthLedger;
