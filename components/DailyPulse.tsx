import React, { useState, useMemo, useEffect } from 'react';
import { Movie, AnalyticsData, MoviePipelineEntry, Category, AuditEntry } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';
import firebase from 'firebase/compat/app';

interface DailyPulseProps {
    pipeline: MoviePipelineEntry[];
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
}

const PulseMetric: React.FC<{ label: string; value: string | number; color?: string; sub?: string; trend?: string; live?: boolean }> = ({ label, value, color = "text-white", sub, trend, live }) => (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.04] transition-all group relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                {live && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>}
                <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.4em] group-hover:text-red-500 transition-colors">{label}</p>
            </div>
            {trend && <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">{trend}</span>}
        </div>
        <div className="flex items-end gap-3">
            <p className={`text-4xl font-black uppercase tracking-tighter italic ${color}`}>{value}</p>
            {sub && <span className="text-[10px] text-gray-600 font-bold uppercase mb-1">{sub}</span>}
        </div>
    </div>
);

const DailyPulse: React.FC<DailyPulseProps> = ({ pipeline, analytics, movies, categories }) => {
    const { viewCounts: liveViewCounts } = useFestival();
    const [liveNodes, setLiveNodes] = useState(analytics?.liveNodes || 0);
    const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);
    const [aiStatus, setAiStatus] = useState<'nominal' | 'throttled'>('nominal');

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const setupPresenceListener = () => {
            const oneMinAgo = new Date(Date.now() - 60 * 1000);
            return db.collection('presence')
                .where('lastActive', '>=', oneMinAgo)
                .onSnapshot(snap => {
                    setLiveNodes(snap.size);
                });
        };

        let unsubscribePresence = setupPresenceListener();
        
        const refreshInterval = setInterval(() => {
            unsubscribePresence();
            unsubscribePresence = setupPresenceListener();
        }, 30000);

        const unsubAudit = db.collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .onSnapshot(snap => {
                const audits: AuditEntry[] = [];
                snap.forEach(doc => audits.push({ id: doc.id, ...doc.data() } as AuditEntry));
                setRecentAudits(audits);
            });

        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const unsubHealth = db.collection('system_health')
            .where('type', '==', 'AI_QUOTA_BREACH')
            .where('timestamp', '>=', fifteenMinsAgo)
            .onSnapshot(snap => {
                setAiStatus(snap.empty ? 'nominal' : 'throttled');
            });

        return () => {
            unsubscribePresence();
            clearInterval(refreshInterval);
            unsubAudit();
            unsubHealth();
        };
    }, []);

    const catalogAudit = useMemo(() => {
        return (Object.values(movies) as Movie[]).map(m => ({
            key: m.key,
            title: m.title || 'Untitled Node',
            views: liveViewCounts[m.key] || 0,
            hasStream: !!m.fullMovie,
            isUnlisted: m.isUnlisted === true
        })).sort((a, b) => b.views - a.views);
    }, [movies, liveViewCounts]);

    const totalViews = useMemo(() => {
        return (Object.values(liveViewCounts) as number[]).reduce((s, c) => s + (c || 0), 0);
    }, [liveViewCounts]);

    const totalUsers = analytics?.totalUsers || 0;
    const pendingPipeline = pipeline.filter(p => p.status === 'pending');

    return (
        <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <PulseMetric label="Nodes Online" value={liveNodes} color="text-red-500" live={true} sub="NOW" />
                <PulseMetric label="Global Reach" value={totalViews} sub="Views" trend="+196%" />
                <PulseMetric label="Roku Reach" value={analytics?.rokuEngagement?.totalRokuViews || 0} color="text-purple-500" sub="Streams" />
                <PulseMetric label="User Base" value={totalUsers} sub="Accounts" />
                <PulseMetric label="Pipeline" value={pendingPipeline.length} color="text-amber-500" sub="Pending" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Catalog Integrity Audit */}
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Catalog Integrity Audit</h3>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Verification of all live database nodes</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] font-mono">
                                <thead className="text-gray-700 uppercase font-black">
                                    <tr>
                                        <th className="pb-4">Film Node / Title</th>
                                        <th className="pb-4 text-center">Views</th>
                                        <th className="pb-4 text-center">Asset</th>
                                        <th className="pb-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {catalogAudit.map(film => (
                                        <tr key={film.key} className="group hover:bg-white/[0.01]">
                                            <td className="py-4">
                                                <p className="text-white font-black uppercase tracking-tight">{film.title}</p>
                                                <p className="text-[8px] text-gray-700 mt-1">UUID: {film.key}</p>
                                            </td>
                                            <td className="py-4 text-center font-bold text-red-500">
                                                {film.views.toLocaleString()}
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded ${film.hasStream ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {film.hasStream ? 'CONNECTED' : 'MISSING'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className={`text-[8px] font-black uppercase ${film.isUnlisted ? 'text-gray-600' : 'text-indigo-400'}`}>
                                                    {film.isUnlisted ? 'UNLISTED' : 'LIVE'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={`bg-[#0f0f0f] border ${aiStatus === 'throttled' ? 'border-red-600/50 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'border-white/5'} p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-700`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${aiStatus === 'nominal' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]'}`}></div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Intelligence Core Health</h3>
                            </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status Report</p>
                            <p className={`text-lg font-bold ${aiStatus === 'nominal' ? 'text-white' : 'text-red-500'}`}>
                                {aiStatus === 'nominal' ? 'NOMINAL // READY' : 'THROTTLED // LIMIT_BREACH'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-fit">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08)_0%,transparent_70%)]"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            Audit Stream
                        </h3>
                        <div className="space-y-6 relative z-10">
                            {recentAudits.map(log => (
                                <div key={log.id} className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">{log.action}</p>
                                    <p className="text-[10px] text-gray-300 line-clamp-2 italic">"{log.details}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyPulse;