import React from 'react';
import type { FilmmakerFilmPerformance } from '../types';

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * "Why do I get this much?": buyers paid, Square's card fees, what's left, then the
 * filmmaker's and CRATE's parts. Every line adds up to the one above it.
 */
const FilmMoneyBreakdown: React.FC<{ breakdown?: FilmmakerFilmPerformance['breakdown']; className?: string }> = ({ breakdown: b, className = '' }) => {
    if (!b || b.buyersPaid <= 0) {
        return (
            <div className={`rounded-2xl border border-white/5 bg-black/20 p-5 ${className}`}>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Where the money goes</h4>
                <p className="text-sm text-gray-500">No payments for this film yet. When someone buys a ticket, rents it or leaves a tip, the full breakdown shows up here.</p>
            </div>
        );
    }
    const coCredit = b.filmmakerSide - b.yourShare;
    const row = (label: string, value: string, tone = 'text-white', note?: string) => (
        <div className="flex items-start justify-between gap-4 py-1.5">
            <div><span className="text-sm text-gray-300">{label}</span>{note && <span className="block text-[11px] text-gray-500">{note}</span>}</div>
            <span className={`text-sm font-black tabular-nums ${tone}`}>{value}</span>
        </div>
    );
    return (
        <div className={`rounded-2xl border border-white/5 bg-black/20 p-5 ${className}`}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Where the money goes</h4>
            {row('Buyers paid', usd(b.buyersPaid), 'text-white', 'Tickets, rentals and tips')}
            {row('Square card fees', `−${usd(b.cardFees)}`, 'text-red-300', 'Shared by the filmmaker and CRATE. Fees on sales before Oct 31, 2026 are covered by CRATE.')}
            <div className="h-px bg-white/10 my-1" />
            {row('Left to share', usd(b.afterFees))}
            {row(`Filmmaker side (${b.filmmakerPercent}%)`, usd(b.filmmakerSide), 'text-green-400')}
            {coCredit > 0 && row('   Divided with co-credited people', `−${usd(coCredit)}`, 'text-gray-400')}
            {row('CRATE keeps', usd(b.crateShare), 'text-white', 'Pays for hosting, streaming and distribution')}
            <div className="h-px bg-white/10 my-1" />
            {row('Your share', usd(b.yourShare), 'text-green-400')}
        </div>
    );
};

export default FilmMoneyBreakdown;
