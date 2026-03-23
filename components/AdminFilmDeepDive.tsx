import React, { useState, useEffect, useMemo } from 'react';
import { Movie, FilmmakerFilmPerformance, SentimentPoint } from '../types';
import LoadingSpinner from './LoadingSpinner';
import HypeMap from './HypeMap';

interface AdminFilmDeepDiveProps {
    movie: Movie;
    onClose: () => void;
}

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;

const AdminFilmDeepDive: React.FC<AdminFilmDeepDiveProps> = ({ movie, onClose }) => {
    const [performance, setPerformance] = useState<FilmmakerFilmPerformance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDeepDive = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/get-admin-film-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        password: sessionStorage.getItem('adminPassword'),
                        movieKey: movie.key 
                    }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setPerformance(data.performance);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Deep dive failed.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDeepDive();
    }, [movie.key]);

    const sentimentHighlights = useMemo(() => {
        if (!performance || !performance.sentimentData) return [];
        const sentimentData = performance.sentimentData;
        if (sentimentData.length === 0) return [];
        
        const bucketSize = 30;
        const buckets: Record<number, number> = {};
        sentimentData.forEach(p => {
            const idx = Math.floor(p.timestamp / bucketSize);
            buckets[idx] = (buckets[idx] || 0) + 1;
        });
        
        const sortedBuckets = Object.entries(buckets)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
            
        return sortedBuckets.map(([idx, count]) => ({
            time: `${Math.floor(Number(idx) * bucketSize / 60)}:${String((Number(idx) * bucketSize) % 60).padStart(2, '0')}`,
            count,
            intensity: count > 10 ? 'HIGH' : count > 5 ? 'MEDIUM' : 'LOW'
        }));
    }, [performance]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 md:p-10 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl print:bg-white print:text-black print:rounded-none print:border-none print:h-auto print:max-h-none">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Film Intelligence Deep Dive</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Analyzing: {movie.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handlePrint}
                            className="bg-white/5 hover:bg-white/10 text-white font-black py-3 px-6 rounded-xl uppercase text-[10px] tracking-widest transition-all border border-white/10"
                        >
                            Print Report
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-8 md:p-12 space-y-12 scrollbar-hide print:overflow-visible">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center text-red-500 font-black uppercase tracking-widest">{error}</div>
                    ) : performance && (
                        <div className="space-y-12">
                            {/* Top Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {[
                                    { label: 'Total Views', value: performance.views.toLocaleString() },
                                    { label: 'Applauds', value: performance.likes.toLocaleString() },
                                    { label: 'Watchlist', value: performance.watchlistAdds.toLocaleString() },
                                    { label: 'Roku Views', value: (performance.rokuViews || 0).toLocaleString() },
                                    { label: 'Gross Tips', value: formatCurrency(performance.grossDonations), color: 'text-emerald-500' },
                                    { label: 'Gross Tickets', value: formatCurrency(performance.grossAdRevenue), color: 'text-indigo-500' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl text-center print:border-black/10">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">{stat.label}</p>
                                        <p className={`text-2xl font-black italic tracking-tighter ${stat.color || 'text-white'} print:text-black`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Main Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Engagement Heatmap</h3>
                                            <span className="text-[8px] font-mono text-gray-700">NODE_ANALYTICS_STREAM_V4</span>
                                        </div>
                                        <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 print:border-black/10">
                                            <HypeMap sentiment={performance.sentimentData || []} duration={movie.durationInMinutes ? movie.durationInMinutes * 60 : 3600} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Revenue Breakdown</h3>
                                            <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4 print:border-black/10">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Revenue</span>
                                                    <span className="text-sm font-black text-white print:text-black">{formatCurrency(performance.grossDonations + performance.grossAdRevenue)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Platform Fee (30%)</span>
                                                    <span className="text-sm font-black text-red-500/60">-{formatCurrency((performance.grossDonations + performance.grossAdRevenue) * 0.3)}</span>
                                                </div>
                                                <div className="h-px bg-white/5 print:bg-black/10"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase">Net Entitlement (70%)</span>
                                                    <span className="text-xl font-black text-emerald-500">{formatCurrency(performance.totalEarnings)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Sentiment Peaks</h3>
                                            <div className="space-y-2">
                                                {sentimentHighlights.map((h, i) => (
                                                    <div key={i} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex justify-between items-center print:border-black/10">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${h.intensity === 'HIGH' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                                            <span className="text-[10px] font-black text-white uppercase italic print:text-black">Peak at {h.time}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase">{h.count} reactions</span>
                                                    </div>
                                                ))}
                                                {sentimentHighlights.length === 0 && (
                                                    <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-2xl text-[10px] text-gray-700 font-black uppercase tracking-widest">No peaks detected</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Asset Preview</h3>
                                        <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                                            <img src={movie.poster} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                                            <div className="absolute bottom-6 left-6 right-6">
                                                <h4 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">{movie.title}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Dir. {movie.director}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-3xl space-y-4 print:hidden">
                                        <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Admin Actions</h4>
                                        <div className="space-y-2">
                                            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all">Export JSON Manifest</button>
                                            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all">Audit Traffic Logs</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-white/[0.02] text-center print:block hidden">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em]">Crate TV Global Intelligence Report // {new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminFilmDeepDive;
