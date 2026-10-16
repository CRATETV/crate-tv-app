import React, { useEffect, useState } from 'react';
import { ACCENT, AccentName, Card, PageHeader, SectionTitle, StatTile, adminPost, money } from './ui';
import { TAB_META } from './tabMeta';

// Overview: what needs attention, quick actions, and a money snapshot.
// The detailed live dashboard (DailyPulse) is passed in as children below it.

interface Props {
    operatorName: string;
    isMaster: boolean;
    allowedTabs: string[];
    counts: { submissions: number; actors: number; payouts: number; contracts: number };
    spotlightMissing: boolean;
    filmCount: number;
    onNavigate: (id: string) => void;
    children?: React.ReactNode;
}

const greeting = () => {
    const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(new Date()));
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const AdminOverview: React.FC<Props> = ({ operatorName, isMaster, allowedTabs, counts, spotlightMissing, filmCount, onNavigate, children }) => {
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
    if (spotlightMissing && can('spotlight')) attention.push({ id: 'spotlight', icon: '🌟', text: 'Pick this month’s spotlight film', accent: 'amber' });

    const quick = ['movies', 'watchParty', 'contracts', 'email', 'money', 'roku'].filter(can).slice(0, 6);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

    return (
        <div className="space-y-10">
            <PageHeader title={`${greeting()}, ${operatorName || 'there'}`} subtitle={`${today} · ${filmCount} films on CRATE`} accent="coral" />

            <section>
                <SectionTitle title="Needs your attention" />
                {attention.length === 0 ? (
                    <Card><p className="text-white font-semibold">✨ All clear. Nothing is waiting on you right now.</p></Card>
                ) : (
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
                )}
            </section>

            {isMaster && (
                <section>
                    <SectionTitle title="Money" hint="Live from Square. Full detail in Earnings & payouts." right={<button className="text-sm font-bold text-white/80 hover:text-white" onClick={() => onNavigate('money')}>Open →</button>} />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatTile label="This month" icon="📅" accent="sky" value={snapshot ? money(snapshot.month) : snapError ? '—' : '…'} />
                        <StatTile label="CRATE kept this month" icon="🏠" accent="coral" value={snapshot ? money(snapshot.monthCrate) : snapError ? '—' : '…'} />
                        <StatTile label="Owed to filmmakers" icon="⏳" accent="amber" value={snapshot ? money(snapshot.owed) : snapError ? '—' : '…'} onClick={() => onNavigate('money')} />
                        <StatTile label="All-time revenue" icon="💵" accent="green" value={snapshot ? money(snapshot.gross) : snapError ? '—' : '…'} />
                    </div>
                </section>
            )}

            {quick.length > 0 && (
                <section>
                    <SectionTitle title="Jump to" />
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        {quick.map(id => (
                            <button key={id} onClick={() => onNavigate(id)} className="rounded-2xl bg-[#131318] border border-white/[0.07] hover:border-white/20 p-4 text-left transition-all hover:-translate-y-0.5">
                                <span className="text-2xl" aria-hidden>{TAB_META[id].icon}</span>
                                <p className="text-white font-bold mt-2 text-sm">{TAB_META[id].label}</p>
                                <p className="text-xs text-[#8A8A96] mt-0.5 line-clamp-2">{TAB_META[id].desc}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {children && (
                <section>
                    <SectionTitle title="Live on CRATE" hint="Real-time activity, views and recent changes." />
                    {children}
                </section>
            )}
        </div>
    );
};

export default AdminOverview;
