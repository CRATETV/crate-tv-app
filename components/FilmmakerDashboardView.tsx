import React, { useState, useEffect, useMemo } from 'react';
import { FilmmakerAnalytics, Movie, FilmmakerFilmPerformance } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import HypeMap from './HypeMap';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; color?: string }> = ({ title, value, color = "text-white" }) => (
    <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl text-center hover:bg-white/[0.05] transition-colors shadow-xl">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</h3>
        <p className={`text-3xl font-black italic tracking-tighter uppercase ${color}`}>{value}</p>
    </div>
);

const FilmPerformanceCard: React.FC<{ film: FilmmakerFilmPerformance; movie: Movie }> = ({ film, movie }) => {
    // Transparently show the 70/30 split for the filmmaker
    return (
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-8 hover:bg-white/[0.04] transition-all group">
            <div className="flex flex-col md:flex-row gap-10">
                <div className="relative flex-shrink-0">
                    <div className="w-32 h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                        <img src={movie.poster} alt={film.title} className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="flex-grow space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-black text-3xl text-white uppercase tracking-tighter italic leading-none group-hover:text-red-500 transition-colors">{film.title}</h3>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2">AESTHETIC_ID: {movie.key.substring(0,8)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Total Views</p>
                            <p className="text-xl font-black text-white">{film.views.toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Applaud Count</p>
                            <p className="text-xl font-black text-white">{film.likes.toLocaleString()}</p>
                         </div>
                         <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-emerald-500 font-black uppercase mb-1">Direct Tips (70%)</p>
                            <p className="text-xl font-black text-green-500">{formatCurrency(film.netDonationEarnings)}</p>
                         </div>
                         <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-indigo-500 font-black uppercase mb-1">Ticket Yield (70%)</p>
                            <p className="text-xl font-black text-green-500">{formatCurrency(film.netAdEarnings)}</p>
                         </div>
                    </div>

                    <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5">
                        <h4 className="text-[9px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4">Audience Engagement Map</h4>
                        <HypeMap sentiment={film.sentimentData || []} duration={movie.durationInMinutes ? movie.durationInMinutes * 60 : 3600} />
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

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            if (!user?.name) return;
            setIsLoading(true);
            try {
                const analyticsRes = await fetch('/api/get-filmmaker-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directorName: user.name }),
                });

                if (!analyticsRes.ok) throw new Error('Failed to load analytics.');
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData.analytics);
                
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalyticsData();
    }, [user]);

    if (isLoading || isFestivalLoading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 p-8 text-center font-black uppercase tracking-widest">{error}</div>;
    if (!user || !analytics) return <LoadingSpinner />;

    return (
        <div className="space-y-16 pb-32 animate-[fadeIn_0.5s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Available to Authorize" value={formatCurrency(analytics.balance)} color="text-green-500" />
                <StatCard title="Total Dispatched" value={formatCurrency(analytics.totalPaidOut)} />
                <StatCard title="Ticket Yield (70%)" value={formatCurrency(analytics.totalAdRevenue)} color="text-indigo-400" />
                <StatCard title="Community Tips (70%)" value={formatCurrency(analytics.totalDonations)} color="text-emerald-400" />
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                    <h2 className="text-[15rem] font-black italic text-green-500">PAY</h2>
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Net Entitlement</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2">Authorized withdrawal node</p>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <p className="text-gray-400 text-lg leading-relaxed font-medium">Your balance reflects your <span className="text-white font-bold">70% net share</span> of all tickets and donations. Crate TV retains 30% for infrastructure and global distribution overhead.</p>
                        <button 
                            disabled={analytics.balance < 100}
                            className="bg-white text-black font-black px-12 py-6 rounded-2xl uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 shadow-2xl"
                        >
                            Authorize {formatCurrency(analytics.balance)} Disbursement
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Film Performances</h2>
                    <div className="h-px flex-grow bg-white/5"></div>
                </div>
                <div className="space-y-8">
                    {analytics.films.map(film => (
                        <FilmPerformanceCard key={film.key} film={film} movie={allMovies[film.key]} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FilmmakerDashboardView;