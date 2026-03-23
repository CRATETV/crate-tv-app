import React, { useState, useEffect, useMemo } from 'react';
import { FilmmakerAnalytics, Movie, FilmmakerFilmPerformance } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import HypeMap from './HypeMap';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; color?: string }> = ({ title, value, color = "text-white" }) => (
    <div className="bg-white/[0.03] border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl text-center hover:bg-white/[0.05] transition-all hover:scale-[1.02] shadow-xl group">
        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 group-hover:text-white transition-colors">{title}</h3>
        <p className={`text-2xl md:text-3xl font-black italic tracking-tighter uppercase ${color}`}>{value}</p>
    </div>
);

const FilmPerformanceCard: React.FC<{ film: FilmmakerFilmPerformance; movie: Movie }> = ({ film, movie }) => {
    // Extract sentiment highlights (peaks in engagement)
    const sentimentHighlights = useMemo(() => {
        const sentimentData = film.sentimentData || [];
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
    }, [film.sentimentData]);

    return (
        <div className="bg-white/[0.02] border border-white/5 p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] space-y-8 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
            {/* Decorative background element */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none group-hover:bg-red-600/10 transition-colors"></div>
            
            <div className="flex flex-col lg:flex-row gap-6 md:gap-12 relative z-10">
                <div className="relative flex-shrink-0 flex justify-center lg:block">
                    <div className="w-32 h-48 md:w-48 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                        <img src={movie.poster} alt={film.title} className="w-full h-full object-cover" />
                    </div>
                </div>
                
                <div className="flex-grow space-y-6 md:space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-2">
                            <h3 className="font-black text-2xl md:text-4xl text-white uppercase tracking-tighter italic leading-none group-hover:text-red-500 transition-colors">{film.title}</h3>
                            <div className="flex items-center gap-3">
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">AESTHETIC_ID: {movie.key.substring(0,8)}</p>
                                <div className="h-px w-8 bg-white/10"></div>
                                <p className="text-[9px] text-red-500/60 font-black uppercase tracking-widest">{movie.durationInMinutes} MINS</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <div className="bg-red-600/10 border border-red-600/20 px-3 py-1 rounded-full flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                                <p className="text-[8px] text-red-500 font-black uppercase tracking-widest">Live Performance</p>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1 group-hover/stat:text-white transition-colors">Total Views</p>
                            <p className="text-xl md:text-2xl font-black text-white">{film.views.toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1 group-hover/stat:text-white transition-colors">Applaud Count</p>
                            <p className="text-xl md:text-2xl font-black text-white">{film.likes.toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1 group-hover/stat:text-white transition-colors">Watchlist Adds</p>
                            <p className="text-xl md:text-2xl font-black text-white">{film.watchlistAdds.toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-purple-500 font-black uppercase mb-1 group-hover/stat:text-purple-400 transition-colors">Roku Views</p>
                            <p className="text-xl md:text-2xl font-black text-white">{(film.rokuViews || 0).toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-emerald-500 font-black uppercase mb-1 group-hover/stat:text-emerald-400 transition-colors">Direct Tips</p>
                            <p className="text-xl md:text-2xl font-black text-green-500">{formatCurrency(film.netDonationEarnings)}</p>
                         </div>
                         <div className="bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 text-center group/stat">
                            <p className="text-[8px] text-indigo-500 font-black uppercase mb-1 group-hover/stat:text-indigo-400 transition-colors">Ticket Yield</p>
                            <p className="text-xl md:text-2xl font-black text-green-500">{formatCurrency(film.netAdEarnings)}</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Audience Engagement Map</h4>
                                </div>
                                <span className="text-[8px] font-mono text-gray-700">REALTIME_STREAM_V2</span>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <HypeMap sentiment={film.sentimentData || []} duration={movie.durationInMinutes ? movie.durationInMinutes * 60 : 3600} />
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentiment Highlights</h4>
                            {sentimentHighlights.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {sentimentHighlights.map((h, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors group/highlight">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${h.intensity === 'HIGH' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : h.intensity === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Peak at {h.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase group-hover/highlight:text-white transition-colors">{h.count} reactions</span>
                                                <span className="text-[8px] font-black text-red-500/40 uppercase tracking-tighter">INTENSITY_{h.intensity}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full min-h-[120px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-black/20">
                                    <div className="w-8 h-8 border border-white/10 rounded-full flex items-center justify-center mb-3">
                                        <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                                    </div>
                                    <p className="text-[8px] text-gray-700 uppercase font-black tracking-widest">No highlights detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilmmakerDashboardView: React.FC = () => {
    const { user } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading } = useFestival();
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchName, setSearchName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const fetchAnalyticsData = async (name: string) => {
        if (!name) return;
        setIsLoading(true);
        setError('');
        try {
            const analyticsRes = await fetch('/api/get-filmmaker-analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directorName: name }),
            });

            if (!analyticsRes.ok) throw new Error('Failed to load analytics.');
            const analyticsData = await analyticsRes.json();
            setAnalytics(analyticsData.analytics);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (user?.name) {
            setSearchName(user.name);
            fetchAnalyticsData(user.name);
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchName.trim()) {
            setIsSearching(true);
            fetchAnalyticsData(searchName.trim());
        }
    };

    const handlePayoutRequest = async () => {
        if (!analytics || analytics.balance < 100 || !user) return;
        
        setPayoutStatus('submitting');
        try {
            const filmTitles = analytics.films.map(f => f.title);
            const res = await fetch('/api/request-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directorName: searchName || user.name,
                    amount: analytics.balance,
                    email: user.email,
                    filmTitles
                }),
            });

            if (!res.ok) throw new Error('Payout request failed.');
            setPayoutStatus('success');
            
            // Refresh analytics after a short delay to show updated balance (though the API might not reflect it immediately if it only counts 'completed' payouts)
            setTimeout(() => {
                fetchAnalyticsData(searchName || user.name);
                setPayoutStatus('idle');
            }, 3000);

        } catch (err) {
            setPayoutStatus('error');
            setTimeout(() => setPayoutStatus('idle'), 3000);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Crate TV Filmmaker Analytics',
                text: `Check out my film's performance on Crate TV!`,
                url: window.location.href
            }).catch(console.error);
        } else {
            alert("Sharing is not supported on this browser. You can copy the URL to share.");
        }
    };

    if (isLoading || isFestivalLoading) return <LoadingSpinner />;
    
    return (
        <div className="space-y-12 md:space-y-16 pb-32 animate-[fadeIn_0.5s_ease-out] px-4 md:px-0">
            {/* Header Section with Fluid Typography */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <h2 className="text-fluid-hero font-black text-white uppercase tracking-tighter italic leading-[0.8] mb-4">
                            Performance <span className="text-red-600">Report</span>
                        </h2>
                        <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.4em]">
                            Real-time analytics for <span className="text-white">{searchName || user?.name}</span>
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Manual Search Override */}
                        <form onSubmit={handleManualSearch} className="flex gap-2 w-full md:w-auto">
                            <input 
                                type="text"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                placeholder="Search Director/Producer Name"
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-red-500 transition-all flex-grow md:w-64"
                            />
                            <button 
                                type="submit"
                                disabled={isSearching}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {isSearching ? '...' : 'Sync'}
                            </button>
                        </form>
                        
                        <button 
                            onClick={handleShare}
                            className="bg-white/5 border border-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100 6 3 3 0 000-6z" /></svg>
                            Share
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center font-black uppercase tracking-widest text-xs">{error}</div>}

            {analytics && analytics.films.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                        <StatCard title="Available to Authorize" value={formatCurrency(analytics.balance)} color="text-green-500" />
                        <StatCard title="Total Dispatched" value={formatCurrency(analytics.totalPaidOut)} />
                        <StatCard title="Ticket Yield (70%)" value={formatCurrency(analytics.totalAdRevenue)} color="text-indigo-400" />
                        <StatCard title="Community Tips (70%)" value={formatCurrency(analytics.totalDonations)} color="text-emerald-400" />
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/5 p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden group/payout">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12 scale-150 hidden md:block text-green-500 font-black italic text-[18rem] group-hover/payout:opacity-[0.04] transition-opacity">
                            PAY
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6 md:mb-10">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Net Entitlement</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-3">Authorized withdrawal node // SECURE_ACCESS_V4</p>
                                </div>
                            </div>
                            <div className="space-y-8 md:space-y-10">
                                <p className="text-gray-400 text-sm md:text-xl leading-relaxed font-medium max-w-2xl">Your balance reflects your <span className="text-white font-bold">70% net share</span> of all tickets and donations. Crate TV retains 30% for infrastructure and global distribution overhead.</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        disabled={analytics.balance < 100 || payoutStatus === 'submitting' || payoutStatus === 'success'}
                                        className={`bg-white text-black font-black px-8 md:px-14 py-5 md:py-7 rounded-2xl md:rounded-3xl uppercase tracking-[0.2em] text-xs md:text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 shadow-[0_20px_50px_rgba(255,255,255,0.1)] ${payoutStatus === 'success' ? 'bg-green-500 text-white shadow-[0_20px_50px_rgba(34,197,94,0.3)]' : ''}`}
                                        onClick={handlePayoutRequest}
                                    >
                                        {payoutStatus === 'submitting' ? 'Processing...' : 
                                         payoutStatus === 'success' ? 'Request Sent!' : 
                                         payoutStatus === 'error' ? 'Error. Try Again' :
                                         `Authorize ${formatCurrency(analytics.balance)} Disbursement`}
                                    </button>
                                    <button className="bg-white/5 border border-white/10 text-white font-black px-8 md:px-14 py-5 md:py-7 rounded-2xl md:rounded-3xl uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-white/10 transition-all">
                                        View Payout History
                                    </button>
                                </div>
                                {payoutStatus === 'success' && (
                                    <div className="flex items-center gap-3 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <p className="text-green-500 text-[10px] font-black uppercase tracking-widest">Payout request received. Review in progress.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Film Performances</h2>
                            <div className="h-px flex-grow bg-white/5"></div>
                        </div>
                        <div className="space-y-6 md:space-y-8">
                            {analytics.films.map(film => (
                                <FilmPerformanceCard key={film.key} film={film} movie={allMovies[film.key]} />
                            ))}
                        </div>
                    </div>
                </>
            ) : !isLoading && (
                <div className="bg-white/[0.02] border border-white/5 p-12 md:p-20 rounded-[3rem] text-center space-y-6">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">No Films Detected</h3>
                    <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
                        We couldn't find any films associated with the name "<span className="text-white">{searchName}</span>". 
                        Please ensure your name matches exactly how it appears in the film's credits, or try searching for a different variation.
                    </p>
                    <div className="flex justify-center pt-4">
                        <button 
                            onClick={() => {
                                setSearchName('');
                                setAnalytics(null);
                            }}
                            className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                        >
                            Clear Search and Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilmmakerDashboardView;