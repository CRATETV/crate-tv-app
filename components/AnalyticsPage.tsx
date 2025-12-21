
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
    onNavigateToGrowth?: () => void;
}

const AudienceEmailList: React.FC<{ title: string; users: { email: string }[] }> = ({ title, users }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleCopy = () => {
        const emails = users.map(u => u.email).join(', ');
        navigator.clipboard.writeText(emails).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="p-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">{title} ({users.length})</h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md">{copyStatus === 'copied' ? 'Copied!' : 'Copy Emails'}</button>
                    <button onClick={() => setIsOpen(!isOpen)} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md">{isOpen ? 'Hide' : 'Show'} List</button>
                </div>
            </div>
            {isOpen && (
                <div className="border-t border-gray-700 p-4 max-h-60 overflow-y-auto">
                    <ul className="text-sm text-gray-300">
                        {users.map(user => <li key={user.email}>{user.email}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

const CountrySnapshot: React.FC<{ 
    movie: Movie; 
    locations: Record<string, number>;
}> = ({ movie, locations }) => {
    const snapshotRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleShare = async () => {
        if (!snapshotRef.current || isGenerating) return;
        setIsGenerating(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(snapshotRef.current, {
                useCORS: true, 
                backgroundColor: '#111827', // Tailwind gray-900
            });
            
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Could not create image from snapshot.');
    
            const file = new File([blob], `cratetv_viewership_${movie.key}.png`, { type: 'image/png' });
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Viewership for ${movie.title}`,
                    text: `Here's the country-wise traffic bifurcation for "${movie.title}" on Crate TV.`,
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `cratetv_viewership_${movie.key}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Sharing failed:', error);
            alert('Could not generate snapshot. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const sortedLocations = Object.entries(locations).sort(([, a], [, b]) => Number(b) - Number(a));
    const totalViews = sortedLocations.reduce((sum, [, count]) => sum + Number(count), 0);

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mt-4">
            <div ref={snapshotRef} className="bg-gray-900 p-6 rounded-md">
                <div className="flex justify-between items-start mb-4">
                    <img src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png")}`} alt="Crate TV" className="w-24 h-auto" crossOrigin="anonymous"/>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">As of ${new Date().toLocaleDateString()}</p>
                        <p className="font-bold text-white text-lg">Total Views: ${formatNumber(totalViews)}</p>
                    </div>
                </div>
                <h4 className="text-lg font-bold text-white mb-3">Viewership Snapshot: <span className="text-purple-400">{movie.title}</span></h4>
                <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="p-2">Country</th>
                                <th className="p-2 text-right">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedLocations.map(([code, count]) => (
                                <tr key={code} className="border-b border-gray-800">
                                    <td className="p-2 font-medium text-white">{(code)}</td>
                                    <td className="p-2 text-right">{formatNumber(Number(count))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-4 text-right">
                <button onClick={handleShare} disabled={isGenerating} className="submit-btn bg-purple-600 hover:bg-purple-700">
                    {isGenerating ? 'Generating...' : 'Share Snapshot'}
                </button>
            </div>
        </div>
    );
};


const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ viewMode, onNavigateToGrowth }) => {
    const isFestivalView = viewMode === 'festival';
    const [activeTab, setActiveTab] = useState(isFestivalView ? 'festival' : 'overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ square: string | null, firebase: string | null, critical: string | null }>({ square: null, firebase: null, critical: null });
    const [selectedGeoMovie, setSelectedGeoMovie] = useState<string>('');
    const [selectedFilmForReport, setSelectedFilmForReport] = useState<FilmPerformanceData | null>(null);
    const [festivalPayoutStatus, setFestivalPayoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [festivalPayoutMessage, setFestivalPayoutMessage] = useState('');
    const [expandedPayoutRow, setExpandedPayoutRow] = useState<string | null>(null);

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
    
    const handleFestivalPayout = async () => {};
    const handleAdminPayout = async (e: React.FormEvent) => { e.preventDefault(); };
    const handleShare = async () => {};

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
            {/* AI Discovery Banner */}
            {!isFestivalView && (
                <div className="mb-8 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 border border-purple-500/30 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600/20 p-2 rounded-lg text-2xl">✨</div>
                        <div>
                            <h3 className="font-bold text-white">Looking for Growth Strategy?</h3>
                            <p className="text-sm text-purple-200">The new <strong>Growth Intelligence</strong> dashboard provides AI-driven roadmaps and viral marketing insights.</p>
                        </div>
                    </div>
                    {onNavigateToGrowth && (
                        <button 
                            onClick={onNavigateToGrowth}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 px-6 rounded-lg transition-all text-sm whitespace-nowrap"
                        >
                            Open Growth Dashboard
                        </button>
                    )}
                </div>
            )}

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
                        <div className="space-y-12">
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Platform Snapshot</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <StatCard title="Grand Total Revenue" value={formatCurrency(Number(analyticsData.totalRevenue || 0))} />
                                    <StatCard title="Total Platform Revenue" value={formatCurrency(Number(analyticsData.totalCrateTvRevenue || 0))} />
                                    <StatCard title="Total Users" value={formatNumber(Number(analyticsData.totalUsers || 0))} />
                                    <StatCard title="Total Film Views" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + (c || 0), 0))} />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-white">Top Film Performance</h3>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Views</th><th className="p-3">Likes</th><th className="p-3">Donations</th><th className="p-3 no-print">Actions</th></tr></thead>
                                    <tbody>{filmPerformanceData.slice(0, 5).map(film => (
                                        <tr key={film.key} className="border-b border-gray-700"><td className="p-3 font-medium text-white">{film.title}</td><td className="p-3">{formatNumber(film.views)}</td><td className="p-3">{formatNumber(film.likes)}</td><td className="p-3">{formatCurrency(film.donations)}</td><td className="p-3 no-print"><button onClick={() => setSelectedFilmForReport(film)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">View Report</button></td></tr>
                                    ))}</tbody>
                                </table></div>
                            </div>
                        </div>
                    )}
                    
                    {/* AUDIENCE TAB */}
                    {(activeTab === 'audience' && !isFestivalView) && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Audience Segments</h2>
                             <AudienceEmailList title="All Registered Users" users={analyticsData.allUsers} />
                             <AudienceEmailList title="Actors" users={analyticsData.actorUsers} />
                             <AudienceEmailList title="Filmmakers" users={analyticsData.filmmakerUsers} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
