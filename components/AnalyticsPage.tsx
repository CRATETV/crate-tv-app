
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, Movie, AdminPayout, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import FilmReportModal from './FilmReportModal';
import BillingReminders from './BillingReminders';
import BillSavingsPot from './BillSavingsPot';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
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

    // State for Admin Payout
    const [adminPayoutAmount, setAdminPayoutAmount] = useState('');
    const [adminPayoutReason, setAdminPayoutReason] = useState('');
    const [adminPayoutStatus, setAdminPayoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [adminPayoutMessage, setAdminPayoutMessage] = useState('');
    
    const fetchData = async () => {
        if (isLoading) setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            setError({ ...error, critical: 'Authentication error. Please log in again.' });
            setIsLoading(false);
            return;
        }
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
    
    const handleAdminPayout = async (e: React.FormEvent) => { e.preventDefault(); };

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );
    
    const crateTvBalance = analyticsData ? Number(analyticsData.totalCrateTvRevenue || 0) - Number(analyticsData.totalAdminPayouts || 0) : 0;

    return (
        <div style={{ padding: '1rem', backgroundColor: '#1F2937', borderRadius: '8px' }}>
            {!isFestivalView && (
                <div className="no-print flex flex-wrap items-center gap-2 mb-6 border-b border-gray-600 pb-4">
                    <TabButton tabId="overview" label="Overview" />
                    <TabButton tabId="financials" label="Financials" />
                    <TabButton tabId="festival" label="Festival" />
                </div>
            )}

            {error.critical && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>}
            
            {analyticsData && (
                <div className="printable-area">
                    {/* OVERVIEW TAB */}
                    {(activeTab === 'overview' && !isFestivalView) && (
                        <div className="space-y-12">
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Platform Snapshot</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                    <StatCard title="Grand Total Revenue" value={formatCurrency(Number(analyticsData.totalRevenue || 0))} />
                                    <StatCard title="Total Users" value={formatNumber(Number(analyticsData.totalUsers || 0))} />
                                    <StatCard title="Total Film Views" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + (c || 0), 0))} />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-white">Top Film Performance</h3>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Views</th><th className="p-3">Likes</th><th className="p-3">Donations</th><th className="p-3 no-print">Actions</th></tr></thead>
                                    <tbody>{filmPerformanceData.slice(0, 10).map(film => (
                                        <tr key={film.key} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{film.title}</td><td className="p-3">{formatNumber(film.views)}</td><td className="p-3">{formatNumber(film.likes)}</td><td className="p-3">{formatCurrency(film.donations)}</td><td className="p-3 no-print"><button onClick={() => setSelectedFilmForReport(film)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">View Report</button></td></tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        </div>
                    )}

                    {/* FINANCIALS TAB */}
                    {(activeTab === 'financials' && !isFestivalView) && (
                        <div className="space-y-10">
                             <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Revenue Streams</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <StatCard title="Total Donations" value={formatCurrency(Number(analyticsData.totalDonations || 0))} />
                                    <StatCard title="Total Sales" value={formatCurrency(Number(analyticsData.totalSales || 0) + Number(analyticsData.totalFestivalRevenue || 0))} />
                                    <StatCard title="Merch Revenue" value={formatCurrency(Number(analyticsData.totalMerchRevenue || 0))} />
                                    <StatCard title="Ad Revenue" value={formatCurrency(Number(analyticsData.totalAdRevenue || 0))} />
                                    <StatCard title="GRAND TOTAL REVENUE" value={formatCurrency(Number(analyticsData.totalRevenue || 0))} className="lg:col-span-4 bg-purple-900/30 border-purple-700" />
                                </div>
                            </div>
                             <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Crate TV Balance & Payouts</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <StatCard title="Total Paid to Admin" value={formatCurrency(Number(analyticsData.totalAdminPayouts || 0))} />
                                    <StatCard title="Current Available Balance" value={formatCurrency(crateTvBalance)} className="bg-green-900/30 border-green-700" />
                                </div>
                                <BillSavingsPot
                                    currentBalance={Number(analyticsData.billSavingsPotTotal || 0)}
                                    availablePlatformBalance={crateTvBalance}
                                    transactions={analyticsData.billSavingsTransactions}
                                    onRefreshData={fetchData}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {selectedFilmForReport && (
                <FilmReportModal 
                    filmData={selectedFilmForReport}
                    onClose={() => setSelectedFilmForReport(null)} 
                />
            )}
        </div>
    );
};

export default AnalyticsPage;
