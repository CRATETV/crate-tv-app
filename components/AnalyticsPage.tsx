import React, { useState, useEffect } from 'react';
import { AnalyticsData, Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

// Helper to format currency from cents
const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
};

// Reusable stat card component
const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
);

const AnalyticsPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // State for movie data needed for the performance table
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            const isAuthed = sessionStorage.getItem('isAdminAuthenticated') === 'true';
            const storedPassword = sessionStorage.getItem('adminPassword');

            if (isAuthed && storedPassword) {
                setIsAuthenticated(true);

                try {
                    // Fetch live movie data first for the performance table
                    const liveDataRes = await fetchAndCacheLiveData();
                    setAllMovies(liveDataRes.data.movies);

                    // Then, fetch analytics data
                    const analyticsRes = await fetch('/api/get-sales-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: storedPassword }),
                    });

                    if (!analyticsRes.ok) {
                        let errorMessage = `The server responded with an error (Status: ${analyticsRes.status}).`;
                        try {
                            const errorData = await analyticsRes.json();
                            errorMessage = errorData.error || errorMessage;
                        } catch (e) {
                            try {
                                const errorText = await analyticsRes.text();
                                if (errorText.includes('500') && errorText.includes('INTERNAL_SERVER_ERROR')) {
                                     errorMessage = "A critical server error occurred. This is often caused by misconfigured environment variables (like the Firebase Service Account Key) on Vercel. Please double-check your project settings.";
                                } else {
                                     errorMessage = errorText.substring(0, 300) || errorMessage;
                                }
                            } catch (textErr) {
                                errorMessage = 'Failed to fetch analytics and could not read the error response from the server.';
                            }
                        }
                    
                        if (analyticsRes.status === 401) {
                            sessionStorage.removeItem('isAdminAuthenticated');
                            sessionStorage.removeItem('adminPassword');
                            setIsAuthenticated(false);
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const analytics = await analyticsRes.json();
                    setAnalyticsData(analytics);

                } catch (apiError) {
                    const message = apiError instanceof Error ? apiError.message : "An unknown error occurred while fetching analytics.";
                    setError(message);
                } finally {
                    setIsLoading(false);
                }

            } else {
                setIsAuthenticated(false);
                setIsLoading(false);
            }
        };
        checkAuthAndFetchData();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                sessionStorage.setItem('adminPassword', password);
                window.location.reload();
            } else {
                setLoginError(data.error || 'Login failed.');
            }
        } catch (error) {
            setLoginError('An error occurred. Please try again.');
        }
    };
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
                    <h1 className="text-2xl font-bold mb-6 text-center text-white">Analytics Access</h1>
                    <form onSubmit={handleAuth}>
                        <div className="relative">
                            <input
                                type={isPasswordVisible ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Admin Password"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pr-10 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                                {isPasswordVisible ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" />
                                    <path d="M10 12a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                                )}
                            </button>
                        </div>
                        {loginError && <p className="mt-2 text-sm text-red-500">{loginError}</p>}
                        <button type="submit" className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Access Analytics
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const topEarningFilm = analyticsData?.filmmakerPayouts[0]?.movieTitle || 'N/A';
    
    // Combine live movie data with real-time analytics data
    const moviePerformanceData = Object.values(allMovies).map((movie: Movie) => ({
        ...movie,
        views: analyticsData?.viewCounts[movie.key] || 0,
        likes: analyticsData?.movieLikes?.[movie.key] ?? movie.likes ?? 0,
        donations: analyticsData?.filmmakerPayouts.find(p => p.movieTitle === movie.title)?.totalDonations || 0
    })).sort((a,b) => b.views - a.views);

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
                <h1 className="text-xl font-bold">Analytics Dashboard</h1>
                <a 
                    href="/admin" 
                    onClick={(e) => handleNavigate(e, '/admin')}
                    className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Back to Content Admin
                </a>
            </header>

            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    
                    {error && (
                        <div className="bg-red-800 border border-red-600 text-white p-4 rounded-lg mb-8">
                            <h2 className="font-bold">Error Loading Analytics Data</h2>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {analyticsData ? (
                        <>
                            {/* Stat Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                                <StatCard title="Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} description="All payments processed via Square" />
                                <StatCard title="Total Users" value={analyticsData.totalUsers.toLocaleString()} description="Total accounts created" />
                                <StatCard title="Total Donations" value={formatCurrency(analyticsData.totalDonations)} description="Direct support for filmmakers" />
                                <StatCard title="Other Sales" value={formatCurrency(analyticsData.totalSales)} description="Passes, Subscriptions, etc." />
                                <StatCard title="Top Earning Film" value={topEarningFilm} description="By total donations received" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Filmmaker & Subscriber Reports */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Filmmaker Payouts */}
                                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                        <h2 className="text-2xl font-bold text-white mb-4">Filmmaker Payout Report</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-gray-600 text-sm text-gray-400">
                                                        <th className="py-3 pr-4">Film Title</th>
                                                        <th className="py-3 px-4">Donations</th>
                                                        <th className="py-3 px-4">Crate TV Cut (30%)</th>
                                                        <th className="py-3 pl-4 font-bold text-green-400">Filmmaker Payout</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analyticsData.filmmakerPayouts.length > 0 ? analyticsData.filmmakerPayouts.map(payout => (
                                                        <tr key={payout.movieTitle} className="border-b border-gray-700 last:border-b-0">
                                                            <td className="py-4 pr-4 font-medium text-white">{payout.movieTitle}<br /><span className="text-xs text-gray-500">{payout.director}</span></td>
                                                            <td className="py-4 px-4">{formatCurrency(payout.totalDonations)}</td>
                                                            <td className="py-4 px-4 text-red-400">{formatCurrency(payout.crateTvCut)}</td>
                                                            <td className="py-4 pl-4 font-bold text-green-400">{formatCurrency(payout.filmmakerPayout)}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan={4} className="text-center py-8 text-gray-500">No donation data yet.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Recent User Sign-ups */}
                                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                        <h2 className="text-2xl font-bold text-white mb-4">Recent User Sign-Ups</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-gray-600 text-sm text-gray-400">
                                                        <th className="py-3 pr-4">Email</th>
                                                        <th className="py-3 pl-4">Date Joined</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analyticsData.recentUsers.length > 0 ? analyticsData.recentUsers.map(user => (
                                                        <tr key={user.email} className="border-b border-gray-700 last:border-b-0">
                                                            <td className="py-3 pr-4 font-medium text-white">{user.email}</td>
                                                            <td className="py-3 pl-4 text-gray-300">{user.creationTime}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan={2} className="text-center py-8 text-gray-500">No new users yet.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Revenue Breakdown */}
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                    <h2 className="text-2xl font-bold text-white mb-4">Revenue Breakdown</h2>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Donations</span>
                                            <span className="font-bold text-white">{formatCurrency(analyticsData.totalDonations)}</span>
                                        </div>
                                        {Object.entries(analyticsData.salesByType).map(([type, amount]: [string, number]) => (
                                            <div key={type} className="flex justify-between items-center">
                                                <span className="text-gray-300 capitalize">{type}s</span>
                                                <span className="font-bold text-white">{formatCurrency(amount)}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-gray-600 pt-4 flex justify-between items-center">
                                            <span className="font-bold text-lg text-purple-400">Total</span>
                                            <span className="font-bold text-lg text-purple-400">{formatCurrency(analyticsData.totalRevenue)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Movie Performance Table */}
                             <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                <h2 className="text-2xl font-bold text-white mb-4">Movie Performance Metrics</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-600 text-sm text-gray-400">
                                                <th className="py-3">Film Title</th>
                                                <th className="py-3 text-center">Views</th>
                                                <th className="py-3 text-center">Likes</th>
                                                <th className="py-3 text-center">Donations Received</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {moviePerformanceData.map(movie => (
                                                <tr key={movie.key} className="border-b border-gray-700 last:border-b-0">
                                                    <td className="py-3 font-medium text-white">{movie.title}</td>
                                                    <td className="py-3 text-center">{movie.views.toLocaleString()}</td>
                                                    <td className="py-3 text-center">{(movie.likes || 0).toLocaleString()}</td>
                                                    <td className="py-3 text-center">{formatCurrency(movie.donations)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="text-center py-16">
                            <h2 className="text-2xl font-bold">No Analytics Data to Display</h2>
                            <p className="text-gray-400 mt-2">There is no sales or user data to report yet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AnalyticsPage;