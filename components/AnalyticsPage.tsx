import React, { useState, useEffect } from 'react';
import { AnalyticsData, Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import Header from './Header';
import Footer from './Footer';
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
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const isAdmin = sessionStorage.getItem('isAdminAuthenticated') === 'true';
            const adminPassword = sessionStorage.getItem('adminPassword');

            if (isAdmin && adminPassword) {
                setIsAuthenticated(true);
                try {
                    const [analyticsRes, liveDataRes] = await Promise.all([
                        fetch('/api/get-sales-data', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: adminPassword }),
                        }),
                        fetchAndCacheLiveData()
                    ]);
                    
                    if (!analyticsRes.ok) {
                        const errorData = await analyticsRes.json();
                        throw new Error(errorData.error || "Failed to fetch analytics data.");
                    }
                    
                    const data = await analyticsRes.json();
                    setAnalyticsData(data);
                    setAllMovies(liveDataRes.data.movies);
                } catch (e) {
                    setError(e instanceof Error ? e.message : "An unknown error occurred.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsAuthenticated(false);
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoading(true);
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
                setIsLoading(false);
            }
        } catch (error) {
            setLoginError('An error occurred. Please try again.');
            setIsLoading(false);
        }
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
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Admin Password"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        />
                        {loginError && <p className="mt-2 text-sm text-red-500">{loginError}</p>}
                        <button type="submit" className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const topEarningFilm = analyticsData?.filmmakerPayouts[0]?.movieTitle || 'N/A';
    
    // Simulate view counts - in a real app, this would come from a database.
    const moviePerformanceData = Object.values(allMovies).map(movie => ({
        ...movie,
        views: Math.floor(Math.random() * (movie.likes * 5 + 500)) + movie.likes,
        donations: analyticsData?.filmmakerPayouts.find(p => p.movieTitle === movie.title)?.totalDonations || 0
    })).sort((a,b) => b.views - a.views);

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-8">Analytics Dashboard</h1>
                    
                    {error && (
                        <div className="bg-red-800 border border-red-600 text-white p-4 rounded-lg mb-8">
                            <h2 className="font-bold">Error Loading Data</h2>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {analyticsData && (
                        <>
                            {/* Stat Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatCard title="Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} description="All payments processed via Square" />
                                <StatCard title="Total Donations" value={formatCurrency(analyticsData.totalDonations)} description="Direct support for filmmakers" />
                                <StatCard title="Other Sales" value={formatCurrency(analyticsData.totalSales)} description="Passes, Subscriptions, etc." />
                                <StatCard title="Top Earning Film" value={topEarningFilm} description="By total donations received" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Filmmaker Payouts */}
                                <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
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
                                
                                {/* Revenue Breakdown */}
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                    <h2 className="text-2xl font-bold text-white mb-4">Revenue Breakdown</h2>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Donations</span>
                                            <span className="font-bold text-white">{formatCurrency(analyticsData.totalDonations)}</span>
                                        </div>
                                        {Object.entries(analyticsData.salesByType).map(([type, amount]) => (
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
                                <p className="text-sm text-yellow-400 bg-yellow-900/50 border border-yellow-800 rounded-md p-3 mb-4">Note: 'Views' are simulated for demonstration purposes and are not real-time analytics.</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-600 text-sm text-gray-400">
                                                <th className="py-3">Film Title</th>
                                                <th className="py-3 text-center">Views (Simulated)</th>
                                                <th className="py-3 text-center">Likes</th>
                                                <th className="py-3 text-center">Donations Received</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {moviePerformanceData.map(movie => (
                                                <tr key={movie.key} className="border-b border-gray-700 last:border-b-0">
                                                    <td className="py-3 font-medium text-white">{movie.title}</td>
                                                    <td className="py-3 text-center">{movie.views.toLocaleString()}</td>
                                                    <td className="py-3 text-center">{movie.likes.toLocaleString()}</td>
                                                    <td className="py-3 text-center">{formatCurrency(movie.donations)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AnalyticsPage;