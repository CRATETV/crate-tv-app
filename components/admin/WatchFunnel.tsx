import React from 'react';
import type { FilmmakerFilmPerformance } from '../../types';

type Watch = NonNullable<FilmmakerFilmPerformance['watch']>[number];

const pct = (n: number) => `${Math.round(n * 100)}%`;

// "How many people watch, finish, and where they stop" for one film (or each episode).
// Plain words first, the bars second; every bar also has its number written out.
export const WatchFunnel: React.FC<{ watch: Watch[] | undefined; className?: string }> = ({ watch, className = '' }) => {
    if (!watch || watch.length === 0) return null;
    const any = watch.some(w => w.plays > 0);
    return (
        <section aria-label="Plays, finish rate and where viewers stop" className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Who watches &amp; where they stop</h3>
                <span className="text-[9px] text-gray-500">Website viewers since Oct 29 2026</span>
            </div>
            {!any && <p className="text-sm text-gray-400">No plays counted yet. Numbers start filling in as people watch on the website.</p>}
            {watch.map((w, i) => w.plays === 0 ? null : (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-4 print:border-black/10">
                    {watch.length > 1 && <p className="text-sm font-bold text-white print:text-black">{w.label}</p>}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Plays</p><p className="text-2xl font-black text-white print:text-black">{w.plays.toLocaleString()}</p></div>
                        <div><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Finished</p><p className="text-2xl font-black text-white print:text-black">{w.finished.toLocaleString()}</p></div>
                        <div><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Finish rate</p><p className="text-2xl font-black text-emerald-500">{w.finishRate == null ? '–' : pct(w.finishRate)}</p></div>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 mb-2">Share of plays still watching, by tenth of the film</p>
                        <ol className="flex items-end gap-1 h-28" aria-label="Share still watching in each tenth of the film">
                            {w.stillWatching.map((v, n) => (
                                <li key={n} className="flex-1 flex flex-col justify-end items-center h-full" title={`${n * 10}–${(n + 1) * 10}%: ${pct(v)} still watching`}>
                                    <span className="text-[10px] text-gray-300 mb-0.5">{pct(v)}</span>
                                    <span className="w-full rounded-t bg-red-600" style={{ height: `${Math.max(2, v * 70)}%` }} />
                                </li>
                            ))}
                        </ol>
                        <div className="flex gap-1 mt-1" aria-hidden="true">
                            {w.stillWatching.map((_, n) => <span key={n} className="flex-1 text-center text-[10px] text-gray-400">{n * 10}%</span>)}
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 print:text-black">
                        {!w.enough ? 'Only a few plays so far, so these numbers can still swing a lot. '
                            : w.biggestDrop ? `Most people leave around ${w.biggestDrop.fromPct}% in (${pct(w.biggestDrop.lostShare)} of plays stop there). ` : ''}
                    </p>
                </div>
            ))}
        </section>
    );
};
export default WatchFunnel;
