import RecentPayments from './RecentPayments';
import React, { useEffect, useState } from 'react';
import { lineupProblems } from '../../api/_lib/lineupCheck';
import { ACCENT, AccentName, Disclosure, PageHeader, SectionTitle, StatTile, adminPost, money } from './ui';
import { TAB_META } from './tabMeta';
import { PremiereSummary } from './PremiereChecklist';
import BackupCard from './BackupCard';
import { filmStatus, groupCounts, type FilmGroup } from '../../api/_lib/filmStatus';

// Overview (Nov 2026 redesign): jump links first, then what needs attention, the next premiere, the films and
// the money at a glance. Anything that is detail rather than a decision folds behind an arrow (Disclosure).
// The detailed live dashboard (DailyPulse) is passed in as children and only loads when opened.

interface Props {
    operatorName: string;
    isMaster: boolean;
    allowedTabs: string[];
    counts: { submissions: number; actors: number; payouts: number; contracts: number };
    spotlightMissing: boolean;
    filmCount: number;
    /** For "Your films at a glance". */
    movies?: Record<string, any>;
    categories?: Record<string, any>;
    festivalData?: any[];
    /** Opens Films on that filter. */
    onOpenFilms?: (group: FilmGroup) => void;
    onNavigate: (id: string) => void;
    children?: React.ReactNode;
}

const greeting = () => {
    const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(new Date()));
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const AdminOverview: React.FC<Props> = ({ operatorName, isMaster, allowedTabs, counts, spotlightMissing, filmCount, movies, categories, festivalData, onOpenFilms, onNavigate, children }) => {
    // The soonest premiere that hasn't ended: a film with its watch party switched on and a time set.
    const nextPremiere = React.useMemo(() => {
        if (!movies) return null;
        const now = Date.now();
        const upcoming = Object.values(movies).filter((m: any) => m && m.isWatchPartyEnabled && !m.partnerId && Number.isFinite(Date.parse(m.watchPartyStartTime || '')) && Date.parse(m.watchPartyStartTime) > now - 6 * 3600_000);
        upcoming.sort((a: any, b: any) => Date.parse(a.watchPartyStartTime) - Date.parse(b.watchPartyStartTime));
        return (upcoming[0] as any) || null;
    }, [movies]);
    const filmCounts = React.useMemo(() => {
        if (!movies) return null;
        const now = Date.now();
        return groupCounts(Object.values(movies).filter((m: any) => m?.key).map((m: any) => filmStatus(m.key, m, categories, festivalData, now)));
    }, [movies, categories, festivalData]);
    const [snapshot, setSnapshot] = useState<{ month: number; monthCrate: number; owed: number; gross: number } | null>(null);
    const [snapError, setSnapError] = useState(false);

    useEffect(() => {
        if (!isMaster) return;
        adminPost<any>('/api/admin-earnings', { action: 'summary' })
            .then(d => {
                const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
                const m = (d.months || []).find((x: any) => x.month === key);
                setSnapshot({ month: m?.gross || 0, monthCrate: m?.crate || 0, owed: d.totals?.owedNow || 0, gross: d.totals?.gross || 0 });
            })
            .catch(() => setSnapError(true));
    }, [isMaster]);

    const can = (id: string) => allowedTabs.includes(id);
    const attention: { id: string; icon: string; text: string; accent: AccentName }[] = [];
    if (counts.submissions && can('submissions')) attention.push({ id: 'submissions', icon: '📥', text: `${counts.submissions} new film submission${counts.submissions === 1 ? '' : 's'} to review`, accent: 'orange' });
    if (counts.actors && can('actors')) attention.push({ id: 'actors', icon: '🎭', text: `${counts.actors} actor profile${counts.actors === 1 ? '' : 's'} waiting for approval`, accent: 'magenta' });
    if (counts.payouts && can('money')) attention.push({ id: 'money', icon: '💸', text: `${counts.payouts} filmmaker${counts.payouts === 1 ? ' has' : 's have'} asked to be paid`, accent: 'green' });
    if (counts.contracts && can('contracts')) attention.push({ id: 'contracts', icon: '✍️', text: `${counts.contracts} agreement${counts.contracts === 1 ? '' : 's'} not signed yet`, accent: 'violet' });
    // Festival lineup: a film that was deleted/re-added, or has no streaming video, would break the night.
    const lineup = React.useMemo(() => lineupProblems(festivalData as any[], movies as any, Date.now()), [festivalData, movies]);
    if (lineup.length && (can('pwff') || can('watchParty'))) {
        const first = lineup[0];
        attention.push({ id: can('pwff') ? 'pwff' : 'watchParty', icon: '🎬', text: `Festival lineup: ${lineup.length} film problem${lineup.length === 1 ? '' : 's'}. ${first.text}`, accent: 'coral' });
    }
    if (spotlightMissing && can('spotlight')) attention.push({ id: 'spotlight', icon: '🌟', text: 'Pick the next monthly spotlight film', accent: 'amber' });

    const quick = ['movies', 'watchParty', 'share', 'money', 'email', 'contracts', 'roku'].filter(can).slice(0, 7);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

    const filmSummary = filmCounts
        ? [`${filmCounts.live} live`, filmCounts.hidden ? `${filmCounts.hidden} hidden` : '', filmCounts.soon ? `${filmCounts.soon} coming soon` : '', filmCounts.premiere ? `${filmCounts.premiere} premiere${filmCounts.premiere === 1 ? '' : 's'}` : '', filmCounts.festival ? `${filmCounts.festival} in a festival` : '', filmCounts.norow ? `${filmCounts.norow} not in a row` : ''].filter(Boolean).join(' · ')
        : '';

    return (
        <div className="space-y-6 md:space-y-7 max-w-[1200px]">
            <div>
                <PageHeader title={`${greeting()}, ${operatorName || 'there'}`} subtitle={`${today} · ${filmCount} films on CRATE`} accent="coral" />
                {quick.length > 0 && (
                    <nav aria-label="Jump to" className="-mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8A8A96] mr-1 w-full sm:w-auto">Jump to</span>
                        {quick.map(id => (
                            <button key={id} onClick={() => onNavigate(id)} title={TAB_META[id].desc}
                                className="inline-flex items-center gap-2 rounded-full bg-[#131318] border border-white/[0.09] hover:border-white/30 hover:bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors">
                                <span aria-hidden>{TAB_META[id].icon}</span>{TAB_META[id].label}
                            </button>
                        ))}
                    </nav>
                )}
            </div>

            {attention.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#1FCB7A]/25 bg-[#1FCB7A]/[0.06] px-4 py-3">
                    <span aria-hidden>✨</span>
                    <p className="text-sm text-white"><strong className="font-bold">All clear.</strong> <span className="text-[#A1A1AD]">Nothing is waiting on you right now.</span></p>
                </div>
            ) : (
                <section>
                    <SectionTitle title="Needs your attention" />
                    <div className="grid md:grid-cols-2 gap-3">
                        {attention.map(a => (
                            <button key={a.id} onClick={() => onNavigate(a.id)}
                                className="flex items-center gap-4 text-left rounded-2xl px-5 py-4 border transition-all hover:-translate-y-0.5"
                                style={{ background: `${ACCENT[a.accent]}14`, borderColor: `${ACCENT[a.accent]}40` }}>
                                <span className="text-2xl" aria-hidden>{a.icon}</span>
                                <span className="flex-1 text-white font-semibold">{a.text}</span>
                                <span className="text-sm font-bold" style={{ color: ACCENT[a.accent] }}>Open →</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {nextPremiere && (can('movies') || can('watchParty')) && (
                <PremiereSummary movie={nextPremiere} title={nextPremiere.title || 'Untitled'}
                    actions={<div className="flex gap-3 ml-auto">
                        {can('watchParty') && <button className="text-xs font-bold text-white/80 hover:text-white" onClick={() => onNavigate('watchParty')}>Watch parties →</button>}
                        {can('movies') && <button className="text-xs font-bold text-white/80 hover:text-white" onClick={() => onNavigate('movies')}>Films →</button>}
                    </div>} />
            )}

            {filmCounts && onOpenFilms && can('movies') && (
                <Disclosure id="films" title="Your films" summary={filmSummary} defaultOpen
                    right={<button className="text-sm font-bold text-white/80 hover:text-white whitespace-nowrap shrink-0" onClick={() => onNavigate('movies')}>All films →</button>}>
                    <p className="text-xs text-[#8A8A96] mb-3">Tap a tile to see those films and why each one is where it is.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        <StatTile compact label="Live" icon="✅" accent="green" value={filmCounts.live} onClick={() => onOpenFilms('live')} />
                        <StatTile compact label="Hidden" icon="🙈" accent="amber" value={filmCounts.hidden} onClick={() => onOpenFilms('hidden')} />
                        <StatTile compact label="Coming soon" icon="🗓️" accent="sky" value={filmCounts.soon} onClick={() => onOpenFilms('soon')} />
                        <StatTile compact label="Premieres" icon="🍿" accent="coral" value={filmCounts.premiere} onClick={() => onOpenFilms('premiere')} />
                        <StatTile compact label="In a festival" icon="🎬" accent="violet" value={filmCounts.festival} onClick={() => onOpenFilms('festival')} />
                        <StatTile compact label="Not in a row" icon="🧭" accent="orange" value={filmCounts.norow} onClick={() => onOpenFilms('norow')} />
                    </div>
                </Disclosure>
            )}

            {isMaster && (
                <section>
                    <SectionTitle title="Money" hint="Live from Square." right={<button className="text-sm font-bold text-white/80 hover:text-white" onClick={() => onNavigate('money')}>Open Money →</button>} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <StatTile compact label="This month" icon="📅" accent="sky" value={snapshot ? money(snapshot.month) : snapError ? '—' : '…'} />
                        <StatTile compact label="CRATE kept this month" icon="🏠" accent="coral" value={snapshot ? money(snapshot.monthCrate) : snapError ? '—' : '…'} />
                        <StatTile compact label="Owed to filmmakers" icon="⏳" accent="amber" value={snapshot ? money(snapshot.owed) : snapError ? '—' : '…'} onClick={() => onNavigate('money')} />
                    </div>
                    <RecentPayments onOpenMoney={() => onNavigate('money')} />
                </section>
            )}

            {(isMaster || children) && (
                <div className="space-y-3">
                    {isMaster && <BackupCard />}
                    {children && (
                        <Disclosure id="live" title="Live on CRATE" summary="Real-time activity, views and recent changes">
                            {children}
                        </Disclosure>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOverview;
