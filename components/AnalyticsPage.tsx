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

// Define a type for the merged film data to use in the modal
type FilmPerformanceData = {
    key: string;
    title: string;
    director: string;
    views: number;
    likes: number;
    donations: number;
    crateTvCut: number;
    filmmakerPayout: number;
};


const AnalyticsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ square: string | null, firebase: string | null, critical: string | null }>({ square: null, firebase: null, critical: null });
    const [selectedGeoMovie, setSelectedGeoMovie] = useState<string>('');
    const [selectedFilmForReport, setSelectedFilmForReport] = useState<FilmPerformanceData | null>(null);
    
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
                // Set initial movie for geo view
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
        // FIX: Explicitly cast Object.values to Movie[] to fix type inference issues.
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
                filmmakerPayout: payoutInfo?.filmmakerPayout || 0,
            };
        }).sort((a, b) => b.views - a.views);
    }, [analyticsData, allMovies]);

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

    return (
        <div style={{ padding: '1rem', backgroundColor: '#1F2937', borderRadius: '8px' }}>
            <div className="no-print flex flex-wrap items-center gap-2 mb-6 border-b border-gray-600 pb-4">
                <TabButton tabId="overview" label="Overview" />
                <TabButton tabId="audience" label="Audience" />
                <TabButton tabId="financials" label="Financials" />
                <TabButton tabId="festival" label="Festival" />
            </div>

            {error.critical && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>}
            
            {!analyticsData && !isLoading && !error.critical && (
                 <div className="p-4 mb-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 rounded-md">No analytics data could be loaded. Firebase or Square might be misconfigured.</div>
            )}

            {analyticsData && (
                <div className="printable-area">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-white">Platform Overview</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <StatCard title="Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} />
                                <StatCard title="Total Users" value={formatNumber(analyticsData.totalUsers)} />
                                {/* FIX: Cast Object.values to number[] to resolve reduce type inference error. */}
                                <StatCard title="Total Film Views" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + c, 0))} />
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
                    {activeTab === 'audience' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Viewership by Country</h2>
                                <select value={selectedGeoMovie} onChange={e => setSelectedGeoMovie(e.target.value)} className="form-input mb-4"><option value="">Select a Film</option>{Object.keys(allMovies).map(key => <option key={key} value={key}>{allMovies[key].title}</option>)}</select>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Country Code</th><th className="p-3">Views</th></tr></thead>
                                    <tbody>{selectedGeoMovie && analyticsData.viewLocations[selectedGeoMovie] ? Object.entries(analyticsData.viewLocations[selectedGeoMovie]).sort(([, a], [, b]) => b - a).map(([code, count]) => (
                                        <tr key={code} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{code}</td><td className="p-3">{formatNumber(count)}</td></tr>
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
                                    <tbody>{analyticsData.allUsers.map(user => (
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
                    {activeTab === 'financials' && (
                        <div className="space-y-10">
                             <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Revenue Streams</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <StatCard title="Total Donations" value={formatCurrency(analyticsData.totalDonations)} />
                                    <StatCard title="Total Sales" value={formatCurrency(analyticsData.totalSales + analyticsData.totalFestivalRevenue)} />
                                    <StatCard title="Merch Revenue" value={formatCurrency(analyticsData.totalMerchRevenue)} />
                                    <StatCard title="Ad Revenue" value={formatCurrency(analyticsData.totalAdRevenue)} />
                                    <StatCard title="GRAND TOTAL REVENUE" value={formatCurrency(analyticsData.totalRevenue)} className="lg:col-span-4 bg-purple-900/30 border-purple-700" />
                                </div>
                            </div>

                            {Object.keys(analyticsData.merchSales).length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold mb-4 text-white">Merchandising Sales</h3>
                                    <div className="overflow-x-auto"><table className="w-full text-left">
                                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Item</th><th className="p-3 text-center">Units Sold</th><th className="p-3 text-right">Revenue</th></tr></thead>
                                        <tbody>
                                            {Object.values(analyticsData.merchSales).map(item => (
                                                // FIX: Added explicit types to resolve property access errors on 'item'.
                                                <tr key={(item as any).name} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{(item as any).name}</td><td className="p-3 text-center">{formatNumber((item as any).units)}</td><td className="p-3 text-right">{formatCurrency((item as any).revenue)}</td></tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="font-bold">
                                            <tr className="border-b border-gray-600"><td className="p-3 text-right" colSpan={2}>Crate TV's Cut (15%)</td><td className="p-3 text-right text-red-400">{formatCurrency(analyticsData.crateTvMerchCut)}</td></tr>
                                            <tr><td className="p-3 text-right" colSpan={2}>Net Merch Revenue</td><td className="p-3 text-right text-green-400">{formatCurrency(analyticsData.totalMerchRevenue - analyticsData.crateTvMerchCut)}</td></tr>
                                        </tfoot>
                                    </table></div>
                                </div>
                            )}

                             <div>
                                <h3 className="text-xl font-bold mb-4 text-white">Filmmaker Payouts (from Donations)</h3>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Director</th><th className="p-3">Total Donations</th><th className="p-3">Crate TV Cut (30%)</th><th className="p-3">Filmmaker Payout</th></tr></thead>
                                    <tbody>{analyticsData.filmmakerPayouts.map(p => (
                                        <tr key={p.movieTitle} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{p.movieTitle}</td><td className="p-3">{p.director}</td><td className="p-3">{formatCurrency(p.totalDonations)}</td><td className="p-3 text-red-400">{formatCurrency(p.crateTvCut)}</td><td className="p-3 font-bold text-green-400">{formatCurrency(p.filmmakerPayout)}</td></tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        </div>
                    )}

                    {/* FESTIVAL TAB */}
                    {activeTab === 'festival' && (
                        <div>
                            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-white">Festival Analytics</h2>
                                <div className="no-print flex gap-4">
                                    <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print</button>
                                    {'share' in navigator && <button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Share</button>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <StatCard title="Total Festival Revenue" value={formatCurrency(analyticsData.totalFestivalRevenue)} className="sm:col-span-1" />
                                <StatCard title="All-Access Passes" value={analyticsData.festivalPassSales.units} />
                                <StatCard title="Individual Blocks" value={analyticsData.festivalBlockSales.units} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* FIX: The value from analyticsData.totalFestivalRevenue can be inferred as 'any' or 'unknown' from a JSON response. Explicitly cast to Number before performing arithmetic to ensure type safety and prevent runtime errors. */}
                                <StatCard title="Crate TV's Share (30%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.30)} />
                                <StatCard title="Playhouse West's Share (70%)" value={formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.70)} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Sales by Item</h3>
                            <div className="overflow-x-auto"><table className="w-full text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Item</th><th className="p-3">Units Sold</th><th className="p-3">Revenue</th></tr></thead>
                                <tbody>
                                    <tr className="border-b border-gray-700 font-semibold"><td className="p-3">All-Access Pass</td><td>{analyticsData.festivalPassSales.units}</td><td>{formatCurrency(analyticsData.festivalPassSales.revenue)}</td></tr>
                                    {/* FIX: Add explicit types to map parameters to resolve inference error. */}
                                    {Object.entries(analyticsData.salesByBlock).map(([title, sales]: [string, { units: number; revenue: number }]) => (
                                        <tr key={title} className="border-b border-gray-700"><td className="p-3">{title}</td><td>{sales.units}</td><td>{formatCurrency(sales.revenue)}</td></tr>
                                    ))}
                                </tbody>
                            </table></div>
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