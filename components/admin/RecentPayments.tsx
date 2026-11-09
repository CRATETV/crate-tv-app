import React, { useCallback, useEffect, useState } from 'react';
import { Card, Disclosure, adminPost } from './ui';
import { recentPayments, type PaymentRow } from '../../api/_lib/recentPayments';

// Dashboard: "Money coming in". Payments from the last 7 days, with the ones that
// arrived since you last pressed "Got it" highlighted, so you know when there is
// money to pay out. Reads the same Square list as Payments & refunds.
const KEY = 'crate-payments-seen';
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

const readSeen = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };

const RecentPayments: React.FC<{ onOpenMoney: () => void }> = ({ onOpenMoney }) => {
    const [rows, setRows] = useState<PaymentRow[] | null>(null);
    const [seen, setSeen] = useState(readSeen);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => {
        adminPost<{ squareConnected: boolean; payments: PaymentRow[] }>('/api/admin-payments', { action: 'list', days: 7 })
            .then(d => { setRows(d.payments || []); setFailed(false); })
            .catch(() => setFailed(true));
    }, []);
    useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 60_000); return () => clearInterval(t); }, [load]);

    if (failed && !rows) return null;                         // never show a scary error for a nice-to-have card
    if (!rows) return null;
    const { lines, newCount, newCents } = recentPayments(rows, seen);
    const gotIt = () => { const now = Date.now(); try { localStorage.setItem(KEY, String(now)); } catch { /* none */ } setSeen(now); };

    const summary = newCount
        ? `${newCount} new payment${newCount === 1 ? '' : 's'} (${money(newCents)}) since you last looked`
        : lines.length ? `${lines.length} in the last 7 days, nothing new` : 'No payments in the last 7 days';

    return (
        <Disclosure id="payments" title="Money coming in" summary={summary} accent={newCount ? 'green' : undefined} defaultOpen={newCount > 0}
            right={<div className="flex gap-3 shrink-0">
                {newCount > 0 && <button className="text-sm font-bold text-white/80 hover:text-white" onClick={gotIt}>Got it</button>}
                <button className="text-sm font-bold text-white/80 hover:text-white whitespace-nowrap" onClick={onOpenMoney}>Who to pay →</button>
            </div>}>
            {lines.length === 0 ? (
                <p className="text-sm text-[#A1A1AD]">No payments in the last 7 days.</p>
            ) : (
                <ul className="divide-y divide-white/[0.06] -mx-1">
                    {lines.map(l => (
                        <li key={l.id} className="flex items-center gap-3 px-1 py-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${l.isNew ? 'bg-[#1FCB7A]' : 'bg-white/10'}`} aria-label={l.isNew ? 'New' : ''} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-white font-semibold truncate">{l.what}{l.film ? ` · ${l.film}` : ''}</p>
                                <p className="text-xs text-[#8A8A96]">{when(l.at)}</p>
                            </div>
                            <span className={`tabular-nums text-sm font-black ${l.isNew ? 'text-[#1FCB7A]' : 'text-[#A1A1AD]'}`}>{money(l.cents)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Disclosure>
    );
};

export default RecentPayments;
