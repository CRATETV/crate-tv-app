import React from 'react';
import type { FilmmakerFilmPerformance } from '../../types';

type Row = NonNullable<FilmmakerFilmPerformance['countries']>[number];

// "Where they watched": one line per country, biggest first, with the number written out.
export const ViewCountries: React.FC<{ countries: Row[] | undefined; className?: string }> = ({ countries, className = '' }) => {
    if (!countries) return null;
    const total = countries.reduce((s, c) => s + c.views, 0);
    return (
        <section aria-label="Which countries people watched from" className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Where they watched</h3>
                <span className="text-[9px] text-gray-500">Country only, never names</span>
            </div>
            {total === 0 ? (
                <p className="text-sm text-gray-400">No countries recorded yet. Each new view adds its country here.</p>
            ) : (
                <ul className="space-y-2">
                    {countries.map(c => (
                        <li key={c.code} className="flex items-center gap-3">
                            <span className="w-36 text-sm text-white print:text-black truncate">{c.name}</span>
                            <span className="flex-1 h-2 rounded bg-white/5 overflow-hidden" aria-hidden="true">
                                <span className="block h-full bg-red-600" style={{ width: `${Math.max(3, (c.views / total) * 100)}%` }} />
                            </span>
                            <span className="text-sm font-bold text-white print:text-black tabular-nums w-10 text-right">{c.views}</span>
                            {c.roku > 0 && <span className="text-[10px] text-gray-500 w-16">{c.roku} on Roku</span>}
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-[10px] text-gray-500">Counts start from when each view was recorded, so older views in the total above may not be listed here.</p>
        </section>
    );
};

export default ViewCountries;
