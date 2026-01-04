
import React, { useState, useMemo, useEffect } from 'react';
import { Movie, AnalyticsData, MoviePipelineEntry, Category } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';

interface DailyPulseProps {
    pipeline: MoviePipelineEntry[];
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
}

const formatCurrency = (val: number) => `$${(val / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
    const [liveNodes, setLiveNodes] = useState(analytics?.liveNodes || 0);
    const [objectives, setObjectives] = useState(() => {
        const saved = localStorage.getItem('crate_daily_objectives');
        const today = new Date().toLocaleDateString();
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.date === today) return parsed.tasks;
        }
        return [
            { id: 1, label: 'Apply for 1 Grant', done: false },
            { id: 2, label: 'Review 1 Submission', done: false },
            { id: 3, label: 'Audit Roku Channel Health', done: false },
            { id: 4, label: 'Log Studio Sentiment Point', done: false }
        ];
    });

    useEffect(() => {
        localStorage.setItem('crate_daily_objectives', JSON.stringify({
            date: new Date().toLocaleDateString(),
            tasks: objectives
        }));
    }, [objectives]);

    const toggleObjective = (id: number) => {
        setObjectives(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        const unsubPresence = db.collection('presence')
            .where('lastActive', '>=', oneMinAgo)
            .onSnapshot(snap => setLiveNodes(snap.size));
        return () => unsubPresence();
    }, []);

    const totalViews = useMemo(() => {
        return (Object.values(analytics?.viewCounts || {}) as number[]).reduce((s, c) => s + (c || 0), 0);
    }, [analytics]);

    const pendingPipeline = pipeline.filter(p => p.status === 'pending');

    return (
        <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <PulseMetric label="Nodes Online" value={liveNodes} color="text-red-500" live={true} sub="NOW" />
                <PulseMetric label="Platform Reach" value={totalViews} sub="Page Views" trend="+196%" />
                <PulseMetric label="Yield Yield" value={formatCurrency(analytics?.totalRevenue || 0)} color="text-green-500" sub="GROSS" />
                <PulseMetric label="Pipeline Load" value={pendingPipeline.length} color="text-amber-500" sub="REVIEWS" />
                <PulseMetric label="User Retention" value="75%" color="text-indigo-400" sub="RE-VIEW" trend="+15%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Viral Velocity</h3>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Real-time content acceleration monitor</p>
                            </div>
                            <div className="bg-red-600/10 border border-red-600/30 px-3 py-1 rounded-full">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Global Discovery High</span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {analytics?.recentSpikes && analytics.recentSpikes.length > 0 ? (
                                analytics.recentSpikes.map((spike, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-6 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-red-600/30 transition-all cursor-pointer" onClick={() => window.location.href=`/movie/${spike.movieKey}`}>
                                        <div className="flex items-center gap-6">
                                            <span className="text-4xl font-black text-gray-800 italic group-hover:text-red-600/40 transition-colors">#0{idx+1}</span>
                                            <div>
                                                <p className="font-black text-white uppercase text-xl tracking-tight leading-none mb-1 group-hover:text-red-500 transition-colors">{spike.title}</p>
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Active Discovery Node // Sector {idx + 1}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white">{spike.count}</p>
                                            <p className="text-[8px] text-green-500 font-black uppercase tracking-tighter">Hits / Last 60m</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Awaiting Data Spikes...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08)_0%,transparent_70%)]"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            Daily Missions
                        </h3>
                        <div className="space-y-4 relative z-10">
                            {objectives.map((t: any) => (
                                <button 
                                    key={t.id} 
                                    onClick={() => toggleObjective(t.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${t.done ? 'bg-green-600/10 border-green-500/20 opacity-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-widest ${t.done ? 'text-green-500 line-through' : 'text-gray-300'}`}>{t.label}</span>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${t.done ? 'bg-green-600 border-green-500' : 'border-gray-700'}`}>
                                        {t.done && <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 group hover:border-red-600/20 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">📺</span>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Roku Stabilization</p>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-200 transition-colors">
                            The Roku feed is synced every 60 seconds. Ensure metadata integrity by auditing the "Pipeline" before moving entries to the live catalog.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyPulse;
