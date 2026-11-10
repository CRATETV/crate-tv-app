import React, { useEffect, useState } from 'react';
import { adminPost, money } from './ui';

// The money numbers shown outside Earnings & Payouts (Analytics). Same source as that page
// (/api/admin-earnings), so there is one set of numbers everywhere. Main admin only; staff see a note.
const Tile: React.FC<{ title: string; value: string; hint: string }> = ({ title, value, hint }) => (
    <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[2rem] text-center">
        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mb-2">{title}</h3>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
        <p className="text-xs text-gray-500 mt-2">{hint}</p>
    </div>
);

const LedgerNumbers: React.FC = () => {
    const [d, setD] = useState<any>(null);
    const [err, setErr] = useState(false);
    useEffect(() => { adminPost('/api/admin-earnings', { action: 'summary' }).then(setD).catch(() => setErr(true)); }, []);
    if (err) return <p className="text-sm text-gray-400">The money numbers are for the main admin. They live in Earnings & Payouts.</p>;
    if (!d) return <p className="text-sm text-gray-400">Loading the money numbers…</p>;
    const t = d.totals, ok = d.tieOut?.balanced;
    return (
        <div className="space-y-5">
            <p className={`text-sm font-bold ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>{ok ? '✓ Every payment adds up to the cent.' : '✗ Something does not add up. Open Earnings & Payouts → Month ledger to see which month.'}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Tile title="Came in, all time" value={money(t.gross)} hint="Real payments only, refunds taken out" />
                <Tile title="Filmmakers earned" value={money(t.filmmakerShare + t.shopFilmmaker)} hint={`${money(t.paidOutAllTime)} paid out · ${money(t.owedNow)} owed now`} />
                <Tile title="CRATE keeps" value={money(t.crateKeeps)} hint="Your share of films, plus passes & other" />
            </div>
            <p className="text-xs text-gray-500">These are the same numbers as Earnings & Payouts. Month-by-month detail, every payment, and the spreadsheet download are there.</p>
        </div>
    );
};
export default LedgerNumbers;
