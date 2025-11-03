import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie, AdminPayout } from './types';
import { fetchAndCacheLiveData } from './services/dataService';
import LoadingSpinner from './components/LoadingSpinner';
import FilmReportModal from './components/FilmReportModal';
import BillingReminders from './components/BillingReminders';
import BillSavingsPot from './components/BillSavingsPot';

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

// Define the type for a single filmmaker payout record to ensure type safety.
type FilmmakerPayout = {
    movieTitle: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    totalAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
};


const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ viewMode }) => {
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
        // Keep loading true if it's already loading, but don't flash the spinner for a refresh
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

    useEffect(() => {
        fetchData();
    }, []);

    const filmPerformanceData = useMemo((): FilmPerformanceData[] => {
        if (!analyticsData || !allMovies) return [];
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const payoutInfo = analyticsData.filmmakerPayouts.find((p: FilmmakerPayout) => p.movieTitle === movie.title);
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
        setFestivalPayoutStatus('processing');
        setFestivalPayoutMessage('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/process-festival-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Payout failed.');
            setFestivalPayoutStatus('success');
            setFestivalPayoutMessage(data.message);
        } catch (err) {
            setFestivalPayoutStatus('error');
            setFestivalPayoutMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleAdminPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdminPayoutStatus('processing');
        setAdminPayoutMessage('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/request-admin-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, amount: adminPayoutAmount, reason: adminPayoutReason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Payout request failed.');
            
            // Re-fetch data to show the update
            fetchData();

            setAdminPayoutStatus('success');
            setAdminPayoutMessage('Payout recorded successfully.');
            setAdminPayoutAmount('');
            setAdminPayoutReason('');
            setTimeout(() => setAdminPayoutStatus('idle'), 3000);
        } catch (err) {
            setAdminPayoutStatus('error');
            setAdminPayoutMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
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

    const crateTvBalance = analyticsData ? analyticsData.totalCrateTvRevenue - analyticsData.totalAdminPayouts : 0;

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
                        disabled={festivalPayoutStatus === 'processing' || Number(analyticsData.totalFestivalRevenue) === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg text-lg"
                    >
                        {festivalPayoutStatus === 'processing' ? 'Processing...' : `Pay Playhouse West ${formatCurrency(Number(analyticsData.totalFestivalRevenue) * 0.70)}`}
                    </button>
                    {festivalPayoutMessage && (
                        <p className={`mt-4 text-sm ${festivalPayoutStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{festivalPayoutMessage}</p>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <StatCard title="Grand Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} />
                                <StatCard title="Total Platform Revenue" value={formatCurrency(analyticsData.totalCrateTvRevenue)} />
                                <StatCard title="Total Users" value={formatNumber(analyticsData.totalUsers)} />
                                <StatCard title="Total Film Views" value={formatNumber((Object.values(analyticsData.viewCounts) as number[]).reduce((s, c) => s + (c || 0), 0))} />
                            </div>
                            
                            <BillingReminders />

                            <h3 className="text-xl font-bold mb-4 mt-8 text-white">Film Performance</h3>
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
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Audience Segments</h2>
                             <AudienceEmailList title="All Registered Users" users={analyticsData.allUsers} />
                             <AudienceEmailList title="Actors" users={analyticsData.actorUsers} />
                             <AudienceEmailList title="Filmmakers" users={analyticsData.filmmakerUsers} />
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
                             <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Crate TV Earnings & Payouts</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <StatCard title="Total Platform Earnings" value={formatCurrency(analyticsData.totalCrateTvRevenue)} />
                                    <StatCard title="Total Paid to Admin" value={formatCurrency(analyticsData.totalAdminPayouts)} />
                                    <StatCard title="Current Available Balance" value={formatCurrency(crateTvBalance)} className="bg-green-900/30 border-green-700" />
                                </div>
                                
                                <BillSavingsPot
                                    currentBalance={analyticsData.billSavingsPotTotal}
                                    availablePlatformBalance={crateTvBalance}
                                    transactions={analyticsData.billSavingsTransactions}
                                    onRefreshData={fetchData}
                                />

                                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mt-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Record Admin Payout</h3>
                                    <form onSubmit={handleAdminPayout} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <input type="number" value={adminPayoutAmount} onChange={e => setAdminPayoutAmount(e.target.value)} placeholder="Amount ($)" min="1" step="0.01" className="form-input sm:col-span-1" required />
                                            <input type="text" value={adminPayoutReason} onChange={e => setAdminPayoutReason(e.target.value)} placeholder="Reason (e.g., Bills, Salary)" className="form-input sm:col-span-2" required />
                                        </div>
                                        <button type="submit" disabled={adminPayoutStatus === 'processing'} className="submit-btn bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600">
                                            {adminPayoutStatus === 'processing' ? 'Recording...' : 'Pay Myself'}
                                        </button>
                                        {adminPayoutMessage && <p className={`text-sm ${adminPayoutStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{adminPayoutMessage}</p>}
                                    </form>
                                    <h4 className="text-md font-semibold text-gray-300 mt-8 mb-4">Payout History</h4>
                                    <div className="max-h-60 overflow-y-auto">
                                        {analyticsData.pastAdminPayouts.length > 0 ? (
                                            <ul className="space-y-2">
                                                {analyticsData.pastAdminPayouts.map((p: AdminPayout) => (
                                                    <li key={p.id} className="flex justify-between items-center text-sm p-2 bg-gray-700/50 rounded-md">
                                                        <div>
                                                            <span className="font-semibold text-white">{p.reason}</span>
                                                            <span className="text-xs text-gray-500 ml-2">{new Date(p.payoutDate.seconds * 1000).toLocaleDateString()}</span>
                                                        </div>
                                                        <span className="font-bold text-green-400">{formatCurrency(p.amount)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-500">No admin payouts recorded yet.</p>}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-white">Filmmaker Payouts</h3>
                                <div className="overflow-x-auto"><table className="w-full text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50"><tr><th className="p-3">Film</th><th className="p-3">Donation Payout</th><th className="p-3">Ad Payout</th><th className="p-3">Total Payout</th></tr></thead>
                                    <tbody>{analyticsData.filmmakerPayouts.map((p: FilmmakerPayout) => (
                                         <React.Fragment key={p.movieTitle}>
                                            <tr className="border-b border-gray-700 cursor-pointer hover:bg-gray-700/50" onClick={() => setExpandedPayoutRow(expandedPayoutRow === p.movieTitle ? null : p.movieTitle)}>
                                                <td className="p-3 font-medium text-white">{p.movieTitle}</td>
                                                <td className="p-3">{formatCurrency(p.filmmakerDonationPayout)}</td>
                                                <td className="p-3">{formatCurrency(p.filmmakerAdPayout)}</td>
                                                <td className="p-3 font-bold text-green-400">{formatCurrency(p.totalFilmmakerPayout)}</td>
                                            </tr>
                                            {expandedPayoutRow === p.movieTitle && (
                                                <tr className="bg-gray-800">
                                                    <td colSpan={4} className="p-4">
                                                        <h5 className="font-semibold text-gray-300 mb-2">Viewership by Country for {p.movieTitle}</h5>
                                                        {(analyticsData.viewLocations && analyticsData.viewLocations[Object.keys(allMovies).find(key => allMovies[key].title === p.movieTitle) || '']) ? (
                                                            <ul className="text-sm text-gray-400">
                                                                {Object.entries(analyticsData.viewLocations[Object.keys(allMovies).find(key => allMovies[key].title === p.movieTitle) || '']).map(([country, count]) => (
                                                                    <li key={country}>{country}: {formatNumber(Number(count))} views</li>
                                                                ))}
                                                            </ul>
                                                        ) : <p className="text-sm text-gray-500">No location data available for this film.</p>}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
                    filmData={selectedFilmForReport}
                    onClose={() => setSelectedFilmForReport(null)} 
                />
            )}
        </div>
    );
};

export default AnalyticsPage;