import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; className?: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-center ${className}`}>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

const AnalyticsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('filmPerformance');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ square: string | null, firebase: string | null, critical: string | null }>({ square: null, firebase: null, critical: null });

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
                
            } catch (err) {
                setError(prev => ({ ...prev, critical: err instanceof Error ? err.message : 'An unknown error occurred during data fetch.' }));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const topPerformingFilm = useMemo(() => {
        if (!analyticsData || !allMovies || Object.keys(allMovies).length === 0) return null;
        const { viewCounts } = analyticsData;
        let topKey: string | null = null;
        let maxViews = -1;

        for (const key in viewCounts) {
            if (viewCounts[key] > maxViews) {
                maxViews = viewCounts[key];
                topKey = key;
            }
        }
        return topKey ? { ...allMovies[topKey], views: maxViews } : null;
    }, [analyticsData, allMovies]);

    const handleShare = async () => {
        if (!('share' in navigator) || !analyticsData) {
            alert('Web Share API is not supported in this browser.');
            return;
        }
        try {
            const text = `Crate TV Festival Analytics Summary:\n` +
                `Total Revenue: ${formatCurrency(analyticsData.totalFestivalRevenue)}\n` +
                `All-Access Passes: ${analyticsData.festivalPassSales.units} sold (${formatCurrency(analyticsData.festivalPassSales.revenue)})\n` +
                `Individual Blocks: ${analyticsData.festivalBlockSales.units} sold (${formatCurrency(analyticsData.festivalBlockSales.revenue)})\n\n` +
                `Revenue Split:\n` +
                `  - Crate TV (30%): ${formatCurrency(analyticsData.totalFestivalRevenue * 0.3)}\n` +
                `  - Playhouse West (70%): ${formatCurrency(analyticsData.totalFestivalRevenue * 0.7)}`;

            await navigator.share({
                title: 'Crate TV Festival Analytics Summary',
                text: text,
            });
        } catch (error) {
            console.error('Error sharing analytics:', error);
        }
    };


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
            <div className="no-print flex items-center gap-2 mb-6 border-b border-gray-600 pb-4">
                <TabButton tabId="filmPerformance" label="Film Performance" />
                <TabButton tabId="festivalAnalytics" label="Festival Analytics" />
            </div>

            {error.critical && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>}
            
            {activeTab === 'filmPerformance' && (
                <div>
                    <h2 className="text-xl font-bold mb-4">Film Performance</h2>
                    {topPerformingFilm && (
                        <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Top Performing Film</h3>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <img src={topPerformingFilm.poster} alt={topPerformingFilm.title} className="w-32 h-auto rounded-md object-cover" />
                                <div>
                                    <h4 className="text-2xl font-bold text-white">{topPerformingFilm.title}</h4>
                                    <p className="text-gray-400">by {topPerformingFilm.director}</p>
                                    <p className="text-4xl font-extrabold text-white mt-2">{topPerformingFilm.views.toLocaleString()} <span className="text-lg font-normal text-gray-400">Total Views</span></p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                <tr>
                                    <th className="p-3">Title</th>
                                    <th className="p-3">Views</th>
                                    <th className="p-3">Likes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analyticsData && Object.entries(analyticsData.viewCounts)
                                    // FIX: Add explicit type assertions to fix arithmetic operation error due to failed type inference.
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([key, views]) => (
                                    <tr key={key} className="border-b border-gray-700">
                                        <td className="p-3 font-medium text-white">{allMovies[key]?.title || key}</td>
                                        <td className="p-3">{views.toLocaleString()}</td>
                                        <td className="p-3">{analyticsData.movieLikes[key]?.toLocaleString() || '0'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'festivalAnalytics' && analyticsData && (
                <div className="printable-area">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-white">Festival Analytics Summary</h2>
                        <div className="no-print flex gap-4">
                            <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print Summary</button>
                            {'share' in navigator && <button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Share Summary</button>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <StatCard title="Total Festival Revenue" value={formatCurrency(analyticsData.totalFestivalRevenue)} className="sm:col-span-1" />
                        <StatCard title="All-Access Passes Sold" value={analyticsData.festivalPassSales.units} />
                        <StatCard title="Individual Blocks Sold" value={analyticsData.festivalBlockSales.units} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <StatCard title="Crate TV's Share (30%)" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.30)} />
                        <StatCard title="Playhouse West's Share (70%)" value={formatCurrency(analyticsData.totalFestivalRevenue * 0.70)} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-4">Sales by Item</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                <tr><th className="p-3">Item</th><th className="p-3">Units Sold</th><th className="p-3">Revenue</th></tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-700 font-semibold"><td className="p-3">All-Access Pass</td><td>{analyticsData.festivalPassSales.units}</td><td>{formatCurrency(analyticsData.festivalPassSales.revenue)}</td></tr>
                                {/* FIX: Add explicit type assertion to 'sales' to resolve 'unknown' type error. */}
                                {Object.entries(analyticsData.salesByBlock).map(([title, sales]) => (
                                    <tr key={title} className="border-b border-gray-700"><td className="p-3">{title}</td><td>{(sales as any).units}</td><td>{formatCurrency((sales as any).revenue)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;