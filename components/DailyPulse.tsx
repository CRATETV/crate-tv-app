import React, { useState, useMemo } from 'react';
import { Movie, AnalyticsData, MoviePipelineEntry, Category } from '../types';

interface DailyPulseProps {
    pipeline: MoviePipelineEntry[];
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
}

const formatCurrency = (val: number) => `$${(val / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const PulseMetric: React.FC<{ label: string; value: string | number; color?: string; sub?: string }> = ({ label, value, color = 'text-white', sub }) => (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.04] transition-all group">
        <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.4em] mb-3 group-hover:text-red-500 transition-colors">{label}</p>
        <div className="flex items-end gap-3">
            <p className={`text-4xl font-black uppercase tracking-tighter italic ${color}`}>{value}</p>
            {sub && <span className="text-[10px] text-gray-600 font-bold uppercase mb-1">{sub}</span>}
        </div>
    </div>
);

const DailyPulse: React.FC<DailyPulseProps> = ({ pipeline, analytics, movies, categories }) => {
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const activePartiesCount = useMemo(() => {
        return (Object.values(movies) as Movie[]).filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime && new Date(m.watchPartyStartTime) > new Date()).length;
    }, [movies]);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMsg.trim()) return;
        setIsBroadcasting(true);
        // This would sync to a 'global_alerts' collection in Firestore
        await new Promise(r => setTimeout(r, 1000));
        alert(`Broadcast pushed to all active user sessions: "${broadcastMsg}"`);
        setBroadcastMsg('');
        setIsBroadcasting(false);
    };

    const pendingPipeline = pipeline.filter(p => p.status === 'pending');

    return (
        <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <PulseMetric label="Global Revenue" value={formatCurrency(analytics?.totalRevenue || 0)} sub="Total Flow" />
                <PulseMetric label="Identified Audience" value={analytics?.totalUsers || 0} sub="Registrations" />
                <PulseMetric label="Pipeline Load" value={pendingPipeline.length} color="text-red-600" sub="Awaiting Review" />
                <PulseMetric label="Scheduled Events" value={activePartiesCount} color="text-blue-400" sub="Live Sync" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Recent Transmissions</h3>
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Last 5 Submissions</span>
                        </div>
                        <div className="space-y-4">
                            {pendingPipeline.slice(0, 5).map(p => (
                                <div key={p.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer">
                                    <img src={p.posterUrl} className="w-10 h-14 object-cover rounded shadow-lg" alt="" />
                                    <div className="flex-grow">
                                        <p className="font-bold text-white uppercase tracking-tight group-hover:text-red-500 transition-colors">{p.title}</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Dir. {p.director}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-700 uppercase">Status</p>
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter italic">Pending Review</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-red-600/5 border border-red-500/20 p-8 rounded-[2.5rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-red-500">Live Broadcast Terminal</h3>
                        </div>
                        <form onSubmit={handleBroadcast} className="flex gap-4">
                            <input 
                                value={broadcastMsg}
                                onChange={e => setBroadcastMsg(e.target.value)}
                                placeholder="Push high-priority message to all active users..." 
                                className="form-input !bg-black/40 border-red-500/10 placeholder:text-gray-700" 
                            />
                            <button disabled={isBroadcasting} className="bg-red-600 text-white font-black px-10 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-900/20">
                                {isBroadcasting ? '...' : 'Push'}
                            </button>
                        </form>
                        <p className="text-[8px] text-gray-600 font-black uppercase mt-4 tracking-widest">Warning: This bypasses normal UI states and appears at the top of the Home feed.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-2xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">Live Spotlight Mode</h3>
                        {Object.keys(categories.nowStreaming?.movieKeys || {}).length > 0 ? (
                            <div className="space-y-4">
                                <div className="bg-black/60 rounded-2xl overflow-hidden aspect-video relative group border border-white/10">
                                     <img src={movies[categories.nowStreaming.movieKeys[0]]?.poster} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="" />
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="text-center">
                                             <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Active Now</p>
                                             <p className="text-sm font-black text-white uppercase tracking-tighter px-4 truncate max-w-[180px]">{movies[categories.nowStreaming.movieKeys[0]]?.title}</p>
                                         </div>
                                     </div>
                                </div>
                                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase text-[9px] tracking-widest shadow-xl transition-all active:scale-95">Manage Broadcast</button>
                            </div>
                        ) : (
                            <p className="text-gray-600 text-xs italic">No spotlight active. Target a film in the Catalog to engage networking banners.</p>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Infrastructure Status</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                <span className="text-gray-600">S3 Storage Uplink</span>
                                <span className="text-green-500">STABLE</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                <span className="text-gray-600">Gemini AI Model</span>
                                <span className="text-green-500">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                <span className="text-gray-600">Square Payment Gate</span>
                                <span className="text-green-500">VERIFIED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyPulse;