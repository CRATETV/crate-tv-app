import React, { useState } from 'react';
import { Pill } from './ui';
import { premiereReadiness, countdownText } from '../../api/_lib/premiereChecklist';

// "Is this film ready for its premiere?" Used on the Overview (next premiere)
// and on the Films list. Rules: api/_lib/premiereChecklist.ts.

const MARK = { ok: '✓', todo: '!', info: 'i' } as const;
const LABEL = { ok: 'Done', todo: 'Needs you', info: 'Good to know' } as const;
const COLOR = { ok: '#1FCB7A', todo: '#FFC53D', info: '#8A8A96' } as const;

const Row: React.FC<{ i: { id: string; state: 'ok' | 'todo' | 'info'; label: string; detail: string } }> = ({ i }) => (
    <li className="flex gap-3 items-start">
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
);

/**
 * Slim version for the dashboard: one row with the film, countdown and a ready badge.
 * Anything that needs attention shows right there; the full checklist is behind an arrow.
 */
export const PremiereSummary: React.FC<{ movie: any; title: string; actions?: React.ReactNode }> = ({ movie, title, actions }) => {
    const r = premiereReadiness(movie, Date.now());
    const [open, setOpen] = useState(false);
    const todo = r.items.filter(i => i.state === 'todo');
    return (
        <div className="rounded-2xl bg-[#131318] border border-white/[0.07] px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span aria-hidden className="text-lg">🍿</span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white truncate">
                        <span className="text-[#8A8A96] font-bold uppercase text-[10px] tracking-widest mr-2">Next premiere</span>{title}
                    </p>
                    {r.msUntil != null && (
                        <p className="text-xs text-[#A1A1AD]">
                            {r.msUntil > 0 ? <>in <strong className="text-white">{countdownText(r.msUntil)}</strong></> : 'Premiere has started'}
                        </p>
                    )}
                </div>
                <Pill accent={r.ready ? 'green' : 'amber'} solid>{r.ready ? 'Ready' : `${r.done} of ${r.total} ready`}</Pill>
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    aria-expanded={open}
                    className="text-xs font-bold text-white/80 hover:text-white px-2 py-1"
                >{open ? '▾ Hide checks' : '▸ All checks'}</button>
                {actions}
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done} aria-label="Premiere readiness">
                <div className="h-full rounded-full" style={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%`, background: r.ready ? '#1FCB7A' : '#FFC53D' }} />
            </div>
            {todo.length > 0 && (
                <ul className="space-y-2 mt-3">{todo.map(i => <Row key={i.id} i={i} />)}</ul>
            )}
            {open && <ul className="space-y-2.5 mt-4 pt-4 border-t border-white/[0.06]">{r.items.map(i => <Row key={i.id} i={i} />)}</ul>}
        </div>
    );
};

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
            <ul className="space-y-2.5">{r.items.map(i => <Row key={i.id} i={i} />)}</ul>
        </div>
    );
};

export default PremiereChecklist;
