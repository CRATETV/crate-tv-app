import React from 'react';
import { Pill } from './ui';
import { premiereReadiness, countdownText } from '../../api/_lib/premiereChecklist';

// "Is this film ready for its premiere?" Used on the Overview (next premiere)
// and on the Films list. Rules: api/_lib/premiereChecklist.ts.

const MARK = { ok: '✓', todo: '!', info: 'i' } as const;
const LABEL = { ok: 'Done', todo: 'Needs you', info: 'Good to know' } as const;
const COLOR = { ok: '#1FCB7A', todo: '#FFC53D', info: '#8A8A96' } as const;

const PremiereChecklist: React.FC<{ movie: any; title?: string; compact?: boolean }> = ({ movie, title, compact }) => {
    const r = premiereReadiness(movie, Date.now());
    return (
        <div className={compact ? '' : 'rounded-3xl bg-[#131318] border border-white/[0.07] p-5 md:p-6'}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    {title && <h3 className="text-xl font-black text-white">{title}</h3>}
                    {r.msUntil != null && (
                        <p className="text-sm text-[#A1A1AD] mt-0.5">
                            {r.msUntil > 0 ? <>Premiere in <strong className="text-white">{countdownText(r.msUntil)}</strong></> : 'Premiere has started'}
                        </p>
                    )}
                </div>
                <Pill accent={r.ready ? 'green' : 'amber'} solid>{r.ready ? 'Ready for the premiere' : `${r.done} of ${r.total} ready`}</Pill>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done} aria-label="Premiere readiness">
                <div className="h-full rounded-full" style={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%`, background: r.ready ? '#1FCB7A' : '#FFC53D' }} />
            </div>
            <ul className="space-y-2.5">
                {r.items.map(i => (
                    <li key={i.id} className="flex gap-3 items-start">
                        <span
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                            style={{ background: `${COLOR[i.state]}26`, color: COLOR[i.state] }}
                            aria-hidden
                        >{MARK[i.state]}</span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white">
                                {i.label} <span className="sr-only">({LABEL[i.state]})</span>
                            </p>
                            {i.detail && <p className="text-sm text-[#A1A1AD] leading-snug">{i.detail}</p>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PremiereChecklist;
