
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, Movie, AdminPayout, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import FilmReportModal from './FilmReportModal';
import FinancialOnboardingModal from './FinancialOnboardingModal';
import { getDbInstance } from '../services/firebaseClient';

const formatCurrency = (amountInCents: number) => `$${((amountInCents || 0) / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const StatCard: React.FC<{ title: string; value: string | number; className?: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-center ${className}`}>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

type FilmPerformanceData = {
    key: string;
    title: string;
    director: string;
    views: number;
    likes: number;
    watchlistAdds: number;
    donations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    adRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
};

interface AnalyticsPageProps {
    viewMode: 'full' | 'festival';
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ viewMode }) => {
    const isFestivalView = viewMode === 'festival';
    const [activeTab, setActiveTab] = useState(isFestivalView ? 'festival' : 'overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ square: string | null, firebase: string | null, critical: string | null }>({ square: null, firebase: null, critical: null });
    const [selectedFilmForReport, setSelectedFilmForReport] = useState<FilmPerformanceData | null>(null);

    // Financial Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [payoutRecipientId, setPayoutRecipientId] = useState<string | null>(null);

    // State for Admin Payout
    const [festivalPayoutStatus, setFestivalPayoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [festivalPayoutMessage, setFestivalPayoutMessage] = useState('');
    
    const fetchData = async () => {
        if (isLoading) setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError({ ...error, critical: 'Authentication error. Please log in again.' });
            setIsLoading(false);
            return;
        }

        const db = getDbInstance();
        
        try {
            const [analyticsRes, liveDataRes] = await Promise.all([
                fetch('/api/get-sales-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                }),
                fetchAndCacheLiveData({ force: true })
            ]);
            
            const analyticsJson: { analyticsData: AnalyticsData, errors: any } = await analyticsRes.json();
            if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
            
            if (db) {
                const config = await db.collection('festival').doc('config').get();
                setPayoutRecipientId(config.data()?.payoutRecipientId || null);
            }

            setAnalyticsData(analyticsJson.analyticsData);
            setError(analyticsJson.errors);
            setAllMovies(liveDataRes.data.movies);
            
        } catch (err) {
            setError(prev => ({ ...prev, critical: err instanceof Error ? err.message : 'An unknown error occurred during data fetch.' }));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filmPerformanceData = useMemo((): FilmPerformanceData[] => {
        if (!analyticsData || !allMovies) return [];
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const payoutInfo = (analyticsData.filmmakerPayouts as FilmmakerPayout[]).find((p: FilmmakerPayout) => p.movieTitle === movie.title);
            return {
                key: movie.key,
                title: movie.title,
                director: movie.director,
                views: (analyticsData.viewCounts as Record<string, number>)[movie.key] || 0,
                likes: (analyticsData.movieLikes as Record<string, number>)[movie.key] || 0,
                watchlistAdds: (analyticsData.watchlistCounts as Record<string, number>)[movie.key] || 0,
                donations: payoutInfo?.totalDonations || 0,
                crateTvCut: payoutInfo?.crateTvCut || 0,
                filmmakerDonationPayout: payoutInfo?.filmmakerDonationPayout || 0,
                adRevenue: payoutInfo?.totalAdRevenue || 0,
                filmmakerAdPayout: payoutInfo?.filmmakerAdPayout || 0,
                totalFilmmakerPayout: payoutInfo?.totalFilmmakerPayout || 0,
            };
        }).sort((a, b) => b.views - a.views);
    }, [analyticsData, allMovies]);
    
    const handleFestivalPayout = async () => {
        if (!window.confirm("Authorize immediate dispatch to your linked card? This process is strictly restricted to your verified 70% share.")) return;
        
        setFestivalPayoutStatus('processing');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/process-festival-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Payout initiation failed.');
            setFestivalPayoutStatus('success');
            setFestivalPayoutMessage(data.message);
            fetchData();
        } catch (e) {
            setFestivalPayoutStatus('error');
            setFestivalPayoutMessage(e instanceof Error ? e.message : "System error.");
        }
    };

    if (isLoading) return <LoadingSpinner />;
    
    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );
    
    const crateTvBalance = analyticsData ? Number(analyticsData.totalCrateTvRevenue || 0) - Number(analyticsData.totalAdminPayouts || 0) : 0;

    const renderFestivalAnalytics = () => (
        analyticsData && (
            <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Festival Financial Ledger</h2>
                    <div className="no-print flex items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${payoutRecipientId ? 'bg-green-600/10 border-green-500/20' : 'bg-red-600/10 border-red-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${payoutRecipientId ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${payoutRecipientId ? 'text-green-500' : 'text-red-500'}`}>
                                {payoutRecipientId ? 'Destination Linked' : 'No Payout Link'}
                            </span>
                        </div>
                        <button onClick={() => setShowOnboarding(true)} className="bg-white/5 border border-white/10 text-gray-400 hover:text-white font-black py-2 px-4 rounded-md transition-all uppercase text-[10px] tracking-widest">
                            {payoutRecipientId ? 'Update Card' : 'Link Payout Card'}
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Gross Festival Revenue" value={formatCurrency(Number(analyticsData.totalFestivalRevenue || 0))} className="lg:col-span-1" />
                    <StatCard title="Crate Platform Fee (30%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue || 0) * 0.30)} className="text-red-400" />
                    <StatCard title="Net Partner Share (70%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue || 0) * 0.70)} className="text-green-400" />
                    <StatCard title="Already Paid to Date" value={formatCurrency(Number(analyticsData.totalAdminPayouts || 0))} />
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-500/20 p-10 rounded-[2.5rem] shadow-2xl text-center space-y-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.5em] mb-2">Verified Liquid Balance</p>
                        <p className="text-7xl font-black text-white italic tracking-tighter">
                            {formatCurrency(Math.max(0, (Number(analyticsData.totalFestivalRevenue || 0) * 0.70) - Number(analyticsData.totalAdminPayouts || 0)))}
                        </p>
                    </div>
                    
                    {!payoutRecipientId ? (
                        <div className="relative z-10 space-y-4">
                            <p className="text-gray-500 text-sm font-medium">Link your card information securely to enable the payout terminal.</p>
                            <button
                                onClick={() => setShowOnboarding(true)}
                                className="bg-white text-black font-black py-5 px-12 rounded-2xl text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-xl"
                            >
                                Configure Destination
                            </button>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <button
                                onClick={handleFestivalPayout}
                                disabled={festivalPayoutStatus === 'processing' || ((Number(analyticsData.totalFestivalRevenue || 0) * 0.70) - Number(analyticsData.totalAdminPayouts || 0)) <= 100}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 px-12 rounded-2xl text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-xl shadow-green-900/30"
                            >
                                {festivalPayoutStatus === 'processing' ? 'Authorizing Dispatch...' : 'Process Immediate Payout'}
                            </button>
                        </div>
                    )}
                    
                    {festivalPayoutMessage && (
                        <p className={`relative z-10 text-sm font-bold uppercase tracking-widest ${festivalPayoutStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{festivalPayoutMessage}</p>
                    )}
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Itemized Yield</h3>
                    <div className="bg-black border border-white/10 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <tr><th className="p-5">Node / Asset</th><th className="p-5">Velocity (Units)</th><th className="p-5 text-right">Yield (Gross)</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                <tr className="hover:bg-white/[0.01]">
                                    <td className="p-5 font-bold text-white uppercase tracking-tight">Full Session All-Access Pass</td>
                                    <td className="p-5 font-mono text-gray-400">{formatNumber(Number(analyticsData.festivalPassSales.units || 0))}</td>
                                    <td className="p-5 text-right font-black text-green-500">{formatCurrency(Number(analyticsData.festivalPassSales.revenue || 0))}</td>
                                </tr>
                                {Object.entries(analyticsData.salesByBlock).map(([title, sales]: [string, any]) => (
                                    <tr key={title} className="hover:bg-white/[0.01]">
                                        <td className="p-5 font-bold text-gray-400 uppercase tracking-tight">{title}</td>
                                        <td className="p-5 font-mono text-gray-600">{formatNumber(Number(sales.units || 0))}</td>
                                        <td className="p-5 text-right font-black text-green-700">{formatCurrency(Number(sales.revenue || 0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    );

    return (
        <div className="space-y-12">
            {!isFestivalView && (
                <div className="no-print flex flex-wrap items-center gap-4 mb-10">
                    <TabButton tabId="overview" label="Snapshot" />
                    <TabButton tabId="financials" label="Fiscal Terminal" />
                    <TabButton tabId="festival" label="Festival Ledger" />
                </div>
            )}

            {error.critical && <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500 font-black uppercase text-xs tracking-widest animate-shake">{error.critical}</div>}
            
            {analyticsData && (
                <div className="printable-area">
                    {/* OVERVIEW TAB */}
                    {(activeTab === 'overview' && !isFestivalView) && (
                        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
                            <div>
                                <h2 className="text-3xl font-black mb-8 text-white uppercase tracking-tighter italic">Platform Snapshot</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                    <StatCard title="Gross Platform Yield" value={formatCurrency(Number(analyticsData.totalRevenue || 0))} />
                                    <StatCard title="Active Network Nodes" value={formatNumber(Number(analyticsData.totalUsers || 0))} />
                                    <StatCard title="Global Impression Load" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + (c || 0), 0))} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'festival' && renderFestivalAnalytics()}
                </div>
            )}
            
            {showOnboarding && (
                <FinancialOnboardingModal 
                    onClose={() => setShowOnboarding(false)} 
                    onSuccess={() => { setShowOnboarding(false); fetchData(); }} 
                />
            )}
        </div>
    );
};

export default AnalyticsPage;
