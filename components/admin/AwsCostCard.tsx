import React, { useEffect, useState } from 'react';
import { Disclosure, adminPost } from './ui';
import type { AwsCostSummary } from '../../api/_lib/awsCost';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (ym: string) => { const m = Number(ym.slice(5, 7)); return MONTHS[m - 1] || ym; };
const short = (s: string) => s.replace(/^Amazon |^AWS /, '').replace('Simple Storage Service', 'S3 storage');

const Tile: React.FC<{ label: string; value: string; note?: string; hot?: boolean }> = ({ label, value, note, hot }) => (
    <div className={`rounded-xl p-3 ${hot ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.04]'}`}>
        <p className="text-[11px] uppercase tracking-wide text-[#8A8A96]">{label}</p>
        <p className="text-xl font-extrabold text-white mt-0.5">{value}</p>
        {note && <p className="text-xs text-[#8A8A96] mt-0.5">{note}</p>}
    </div>
);

// Overview → AWS bill: what Amazon is charging for storage and the rest, with and without your credits. Top admin only.
const AwsCostCard: React.FC = () => {
    const [summary, setSummary] = useState<AwsCostSummary | null>(null);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const load = async (refresh = false) => {
        setBusy(true);
        try {
            const r = await adminPost<{ configured: boolean; summary?: AwsCostSummary | null; error?: string }>('/api/admin-aws-cost', refresh ? { refresh: true } : {});
            setError(r.error || ''); setSummary(r.summary || null);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not read the AWS bill.'); }
        setBusy(false); setLoaded(true);
    };
    useEffect(() => { load(); }, []);

    const t = summary?.thisMonth;
    const headline = !loaded ? 'Checking…'
        : error ? 'Not connected yet'
        : !t ? 'No bill data yet'
        : `S3 storage ${usd(summary!.storage)} · all of AWS ${usd(t.charges)} so far in ${monthName(t.month)}${t.credits > 0 ? (t.owed > 0 ? ` · you owe ${usd(t.owed)}` : ' · credits cover it') : ''}`;
    const accent = error ? 'amber' : t && t.owed > 0 ? 'coral' : undefined;
    const rest = (summary?.services || []).filter(s => s.name !== 'Amazon Simple Storage Service').slice(0, 5);

    return (
        <Disclosure id="aws-bill" title="AWS bill" summary={headline} accent={accent} defaultOpen={!!error}>
            {error && <p role="alert" className="text-sm text-amber-400 mb-3">{error}</p>}
            {summary && t && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Tile hot label={`S3 storage · ${monthName(t.month)} so far`} value={usd(summary.storage)} note={summary.storageLastMonth != null ? `${usd(summary.storageLastMonth)} last month` : undefined} />
                        <Tile label="All of AWS so far" value={usd(t.charges)} note="before credits" />
                        <Tile label="Credits applied" value={usd(t.credits)} note="your Amazon credits" />
                        <Tile label="You actually owe" value={usd(t.owed)} note="after credits" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <Tile label={`${monthName(t.month)} guess, whole month`} value={summary.estimateCharges != null ? usd(summary.estimateCharges) : '—'} note={summary.estimateCharges != null ? 'before credits, from the days so far' : 'needs a few days of data'} />
                        <Tile label={summary.lastMonth ? `${monthName(summary.lastMonth.month)}, whole month` : 'Last month'} value={summary.lastMonth ? usd(summary.lastMonth.charges) : '—'} note={summary.lastMonth ? 'before credits' : undefined} />
                    </div>
                    {rest.length > 0 && (
                        <p className="text-xs text-[#8A8A96] mt-3">Other AWS charges this month: {rest.map(s => `${short(s.name)} ${usd(s.amount)}`).join(' · ')}</p>
                    )}
                    <p className="text-xs text-[#8A8A96] mt-2">“Before credits” is what AWS would charge with no credits. It’s the number to watch for when your credits run out. AWS runs about a day behind.</p>
                </>
            )}
            <div className="mt-3">
                <button onClick={() => load(true)} disabled={busy} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold disabled:opacity-60">{busy ? 'Asking AWS…' : 'Refresh from AWS'}</button>
                <span className="text-xs text-[#8A8A96] ml-3">Saved for 6 hours. A refresh costs AWS about 1¢.</span>
            </div>
        </Disclosure>
    );
};
export default AwsCostCard;
