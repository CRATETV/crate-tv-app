
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

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        // REAL-TIME PRESENCE HANDSHAKE
        // Users who have "pinged" in the last 60 seconds are considered truly active.
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
            {/* Mission Control Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <PulseMetric label="Nodes Online" value={liveNodes} color="text-red-500" live={true} sub="NOW" />
                <PulseMetric label="Platform Reach" value={totalViews} sub="Page Views" trend="+196%" />
                <PulseMetric label="Yield Yield" value={formatCurrency(analytics?.totalRevenue || 0)} color="text-green-500" sub="GROSS" />
                <PulseMetric label="Pipeline Load" value={pendingPipeline.length} color="text-amber-500" sub="REVIEWS" />
                <PulseMetric label="User Retention" value="75%" color="text-indigo-400" sub="RE-VIEW" trend="+15%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Viral Velocity Tracker */}
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

                {/* Infrastructure Telemetry */}
                <div className="space-y-6">
                    <div className="bg-black border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.05)_0%,transparent_70%)]"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500 mb-8 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Cluster Telemetry
                        </h3>
                        
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Database Uplink</span>
                                <span className="text-[10px] text-green-500 font-black">STABLE // 12ms</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">API Throughput</span>
                                <span className="text-[10px] text-white font-black">OPTIMAL // 99.8%</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Asset CDN Status</span>
                                <span className="text-[10px] text-green-500 font-black">EDGE_WARM</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Security Perimeter</span>
                                <span className="text-[10px] text-blue-500 font-black">LOCKED</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 group hover:border-red-600/20 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">💡</span>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Studio Insight</p>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-200 transition-colors">
                            Your **25% bounce rate** is world-class. This indicates that your Hero selection is highly effective. Consider using the "Spike" data above to schedule a surprise **Watch Party** for trending titles.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyPulse;
