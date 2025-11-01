import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import FilmReportModal from './FilmReportModal';

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
    const [selectedGeoMovie, setSelectedGeoMovie] = useState<string>('');
    const [selectedFilmForReport, setSelectedFilmForReport] = useState<FilmPerformanceData | null>(null);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [payoutMessage, setPayoutMessage] = useState('');
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
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
                
                const analyticsJson = await analyticsRes.json();
                if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
                
                setAnalyticsData(analyticsJson.analyticsData);
                setError(analyticsJson.errors);
                setAllMovies(liveDataRes.data.movies);
                if (analyticsJson.analyticsData?.viewLocations) {
                    const firstMovieWithGeo = Object.keys(analyticsJson.analyticsData.viewLocations)[0];
                    setSelectedGeoMovie(firstMovieWithGeo || '');
                }
                
            } catch (err) {
                setError(prev => ({ ...prev, critical: err instanceof Error ? err.message : 'An unknown error occurred during data fetch.' }));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filmPerformanceData = useMemo((): FilmPerformanceData[] => {
        if (!analyticsData || !allMovies) return [];
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const payoutInfo = analyticsData.filmmakerPayouts.find(p => p.movieTitle === movie.title);
            return {
                key: movie.key,
                title: movie.title,
                director: movie.director,
                views: analyticsData.viewCounts[movie.key] || 0,
                likes: analyticsData.movieLikes[movie.key] || 0,
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
        setPayoutStatus('processing');
        setPayoutMessage('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/process-festival-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Payout failed.');
            setPayoutStatus('success');
            setPayoutMessage(data.message);
        } catch (err) {
            setPayoutStatus('error');
            setPayoutMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleShare = async () => { /* ... */ };

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

    const renderFestivalAnalytics = () => (
        analyticsData && (
            <div>
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-white">Festival Analytics</h2>
                    <div className="no-print flex gap-4">
                        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print</button>
                        {'share' in navigator && <button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Share</button>}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard title="Total Festival Revenue" value={formatCurrency(Number(analyticsData.totalFestivalRevenue))} className="sm:col-span-1" />
                    <StatCard title="All-Access Passes" value={analyticsData.festivalPassSales.units} />
                    <StatCard title="Individual Blocks" value={analyticsData.festivalBlockSales.units} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <StatCard title="Crate TV's Share (30%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.30)} />
                    <StatCard title="Playhouse West's Share (70%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.70)} />
                </div>
                 <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center">
                    <h3 className="text-lg font-bold text-white mb-4">Process Payout</h3>
                    <button
                        onClick={handleFestivalPayout}
                        disabled={payoutStatus === 'processing' || Number(analyticsData.totalFestivalRevenue) === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg text-lg"
                    >
                        {payoutStatus === 'processing' ? 'Processing...' : `Pay Playhouse West ${formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.70)}`}
                    </button>
                    {payoutMessage && (
                        <p className={`mt-4 text-sm ${payoutStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{payoutMessage}</p>
                    )}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 mt-8">Sales by Item</h3>
                <div className="overflow-x-auto"><table className="w-full text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Item</th><th className="p-3">Units Sold</th><th className="p-3">Revenue</th></tr></thead>
                    <tbody>
                        <tr className="border-b border-gray-700 font-semibold"><td className="p-3">All-Access Pass</td><td>{analyticsData.festivalPassSales.units}</td><td>{formatCurrency(analyticsData.festivalPassSales.revenue)}</td></tr>
                        {Object.entries(analyticsData.salesByBlock).map(([title, sales]) => (
                            <tr key={title} className="border-b border-gray-700"><td className="p-3">{title}</td><td>{(sales as any).units}</td><td>{formatCurrency((sales as any).revenue)}</td></tr>
                        ))}
                    </tbody>
                </table></div>
            </div>
        )
    );

    return (
        <div style={{ padding: '1rem', backgroundColor: '#1F2937', borderRadius: '8px' }}>
            {!isFestivalView && (
                <div className="no-print flex flex-wrap items-center gap-2 mb-6 border-b border-gray-600 pb-4">
                    <TabButton tabId="overview" label="Overview" />
                    <TabButton tabId="audience" label="Audience" />
                    <TabButton tabId="financials" label="Financials" />
                    <TabButton tabId="festival" label="Festival" />
                </div>
            )}

            {error.critical && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>}
            
            {!analyticsData && !isLoading && !error.critical && (
                 <div className="p-4 mb-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 rounded-md">No analytics data could be loaded. Firebase or Square might be misconfigured.</div>
            )}

            {analyticsData && (
                <div className="printable-area">
                    {/* OVERVIEW TAB */}
                    {(activeTab === 'overview' && !isFestivalView) && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-white">Platform Overview</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <StatCard title="Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} />
                                <StatCard title="Total Users" value={formatNumber(analyticsData.totalUsers)} />
                                {/* FIX: Explicitly cast Object.values to number[] to resolve type inference issues with the reduce function. */}
                                <StatCard title="Total Film Views" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + (c || 0), 0))} />
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-white">Film Performance</h3>
                            <div className="overflow-x-auto"><table className="w-full text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Views</th><th className="p-3">Likes</th><th className="p-3">Donations</th><th className="p-3 no-print">Actions</th></tr></thead>
                                <tbody>{filmPerformanceData.map(film => (
                                    <tr key={film.key} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{film.title}</td><td className="p-3">{formatNumber(film.views)}</td><td className="p-3">{formatNumber(film.likes)}</td><td className="p-3">{formatCurrency(film.donations)}</td><td className="p-3 no-print"><button onClick={() => setSelectedFilmForReport(film)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">View Report</button></td></tr>
                                ))}</tbody>
                            </table></div>
                        </div>
                    )}
                    
                    {/* AUDIENCE TAB */}
                    {(activeTab === 'audience' && !isFestivalView) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Viewership by Country</h2>
                                <select value={selectedGeoMovie} onChange={e => setSelectedGeoMovie(e.target.value)} className="form-input mb-4"><option value="">Select a Film</option>{Object.keys(allMovies).map(key => <option key={key} value={key}>{allMovies[key].title}</option>)}</select>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Country Code</th><th className="p-3">Views</th></tr></thead>
                                    <tbody>{selectedGeoMovie && analyticsData.viewLocations[selectedGeoMovie] ? Object.entries(analyticsData.viewLocations[selectedGeoMovie]).sort(([, a], [, b]) => Number(b) - Number(a)).map(([code, count]) => (
                                        <tr key={code} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{code}</td><td className="p-3">{formatNumber(Number(count))}</td></tr>
                                    )) : <tr><td colSpan={2} className="p-4 text-center text-gray-500">No location data for this film.</td></tr>}</tbody>
                                </table></div>
                            </div>
                             <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">User List</h2>
                                <div className="overflow-y-auto max-h-[600px]"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                                        <tr>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Sign Up Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>{analyticsData.allUsers
                                        .filter(user => user.email && user.email !== 'N/A')
                                        .map(user => (
                                        <tr key={user.email} className="border-b border-gray-700">
                                            <td className="p-3 font-medium text-white">{user.email}</td>
                                            <td className="p-3 text-gray-400">{user.creationTime}</td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        </div>
                    )}

                    {/* FINANCIALS TAB */}
                    {(activeTab === 'financials' && !isFestivalView) && (
                        <div className="space-y-10">
                             <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Revenue Streams</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <StatCard title="Total Donations" value={formatCurrency(Number(analyticsData.totalDonations))} />
                                    <StatCard title="Total Sales" value={formatCurrency(Number(analyticsData.totalSales) + Number(analyticsData.totalFestivalRevenue))} />
                                    <StatCard title="Merch Revenue" value={formatCurrency(Number(analyticsData.totalMerchRevenue))} />
                                    <StatCard title="Ad Revenue" value={formatCurrency(Number(analyticsData.totalAdRevenue))} />
                                    <StatCard title="GRAND TOTAL REVENUE" value={formatCurrency(Number(analyticsData.totalRevenue))} className="lg:col-span-4 bg-purple-900/30 border-purple-700" />
                                </div>
                            </div>

                            {Object.keys(analyticsData.merchSales).length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold mb-4 text-white">Merchandising Sales</h3>
                                    <div className="overflow-x-auto"><table className="w-full text-left">
                                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Item</th><th className="p-3 text-center">Units Sold</th><th className="p-3 text-right">Revenue</th></tr></thead>
                                        <tbody>
                                            {Object.values(analyticsData.merchSales).map((item: any) => (
                                                <tr key={item.name} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{item.name}</td><td className="p-3 text-center">{formatNumber(item.units)}</td><td className="p-3 text-right">{formatCurrency(item.revenue)}</td></tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="font-bold">
                                            <tr className="border-b border-gray-600"><td className="p-3 text-right" colSpan={2}>Crate TV's Cut (15%)</td><td className="p-3 text-right text-red-400">{formatCurrency(Number(analyticsData.crateTvMerchCut))}</td></tr>
                                            <tr><td className="p-3 text-right" colSpan={2}>Net Merch Revenue</td><td className="p-3 text-right text-green-400">{formatCurrency(Number(analyticsData.totalMerchRevenue) - Number(analyticsData.crateTvMerchCut))}</td></tr>
                                        </tfoot>
                                    </table></div>
                                </div>
                            )}

                             <div>
                                <h3 className="text-xl font-bold mb-4 text-white">Filmmaker Payouts</h3>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Donation Payout</th><th className="p-3">Ad Payout</th><th className="p-3">Total Payout</th></tr></thead>
                                    <tbody>{analyticsData.filmmakerPayouts.map(p => (
                                        <tr key={p.movieTitle} className="border-b border-gray-700">
                                          <td className="p-3 font-medium text-white">{p.movieTitle}</td>
                                          <td className="p-3">{formatCurrency(p.filmmakerDonationPayout)}</td>
                                          <td className="p-3">{formatCurrency(p.filmmakerAdPayout)}</td>
                                          <td className="p-3 font-bold text-green-400">{formatCurrency(p.totalFilmmakerPayout)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'festival' && renderFestivalAnalytics()}
                </div>
            )}
            
            {selectedFilmForReport && (
                <FilmReportModal 
                    filmData={selectedFilmForReport as any} // Cast to any to avoid type errors
                    onClose={() => setSelectedFilmForReport(null)} 
                />
            )}
        </div>
    );
};

export default AnalyticsPage;
