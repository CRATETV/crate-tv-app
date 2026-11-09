import React, { useEffect, useState } from 'react';
import { Card, EmptyState, Notice, SectionTitle, adminPost } from './ui';
import type { AudienceInsights } from '../../api/_lib/audienceInsights';

// Stats → "Where people come from" and "How many come back". Plain numbers, last 30 days.
const LABEL: Record<string, string> = { direct: 'Direct (typed it in, or an app that hides where they came from)', x: 'X (Twitter)' };
const nice = (s: string) => LABEL[s] || s.charAt(0).toUpperCase() + s.slice(1);

const AudienceInsightsCard: React.FC = () => {
    const [d, setD] = useState<(AudienceInsights & { truncated?: boolean }) | null>(null);
    const [err, setErr] = useState('');
    useEffect(() => { adminPost('/api/audience-insights', {}).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load.')); }, []);

    if (err) return <Notice tone="error">{err}</Notice>;
    if (!d) return <Card><p className="text-sm text-[#8A8A96]">Counting…</p></Card>;
    const noData = d.daysOfData === 0;

    return (
        <section className="space-y-4">
            <SectionTitle title="Where people come from, and who comes back" hint="Last 30 days. This started being recorded on the day it launched, so numbers build up over time." />
            {noData ? (
                <EmptyState icon="🌱" title="Nothing recorded yet" text="Come back in a day or two. Every visit from now on is counted by where it came from." />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <p className="text-xs font-black uppercase tracking-widest text-[#8A8A96] mb-3">Visits by source ({d.visitsWithSource.toLocaleString()})</p>
                        <ul className="space-y-2.5">
                            {d.sources.map(s => (
                                <li key={s.source}>
                                    <div className="flex justify-between gap-3 text-sm"><span className="text-white truncate">{nice(s.source)}</span><span className="text-[#A1A1AD] tabular-nums shrink-0">{s.count.toLocaleString()} · {s.pct}%</span></div>
                                    <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden"><div className="h-full rounded-full bg-[#FF7A59]" style={{ width: `${s.pct}%` }} /></div>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-[#8A8A96] mt-4">Tip: put <span className="text-white">?src=instagram-bio</span> on the end of a link you post, and it will show up here by that name.</p>
                    </Card>
                    <Card>
                        <p className="text-xs font-black uppercase tracking-widest text-[#8A8A96] mb-3">Coming back</p>
                        <p className="text-4xl font-black text-white tabular-nums">{d.returningPct}%</p>
                        <p className="text-sm text-[#A1A1AD] mt-1">{d.returning} of {d.viewers} signed-in viewer{d.viewers === 1 ? '' : 's'} watched on <strong className="text-white">two or more different days</strong>.</p>
                        <p className="text-xs text-[#8A8A96] mt-4">{d.daysOfData} day{d.daysOfData === 1 ? '' : 's'} of data so far. This number will look low or jumpy at first, and settles after a few weeks.{d.truncated ? ' (Very busy period: only the newest 25,000 events were counted.)' : ''}</p>
                    </Card>
                </div>
            )}
        </section>
    );
};

export default AudienceInsightsCard;
