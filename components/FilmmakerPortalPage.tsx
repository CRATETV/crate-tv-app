import React, { useState, useEffect } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import { FilmmakerAnalytics, PayoutRequest } from '../types.ts';

const DIRECTOR_PASSWORD = 'cratedirector';

// Helper to format currency from cents
const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const FilmmakerPortalPage: React.FC = () => {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [directorName, setDirectorName] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Data state
    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [dataError, setDataError] = useState('');
    
    // Payout state
    const [payoutMethod, setPayoutMethod] = useState<'PayPal' | 'Venmo' | 'Other'>('PayPal');
    const [payoutDetails, setPayoutDetails] = useState('');
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [payoutError, setPayoutError] = useState('');


    useEffect(() => {
        const authenticatedDirector = sessionStorage.getItem('authenticatedDirector');
        if (authenticatedDirector) {
            setIsAuthenticated(true);
            setDirectorName(authenticatedDirector);
        } else {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && directorName) {
            const fetchAnalytics = async () => {
                setIsLoading(true);
                setDataError('');
                try {
                    const response = await fetch('/api/get-filmmaker-analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ directorName, password: DIRECTOR_PASSWORD }),
                    });
                    if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch analytics.');
                    const data = await response.json();
                    setAnalytics(data.analytics);
                } catch (err) {
                    setDataError(err instanceof Error ? err.message : 'Could not load analytics data.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAnalytics();
        }
    }, [isAuthenticated, directorName]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        if (password !== DIRECTOR_PASSWORD) {
            setAuthError('Incorrect password.');
            setAuthLoading(false);
            return;
        }

        sessionStorage.setItem('authenticatedDirector', directorName);
        setIsAuthenticated(true);
        setAuthLoading(false);
    };
    
    const handlePayoutRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!analytics || analytics.balance <= 0) return;
        
        setPayoutStatus('submitting');
        setPayoutError('');
        
        try {
            const response = await fetch('/api/request-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directorName,
                    password: DIRECTOR_PASSWORD,
                    amount: analytics.balance,
                    payoutMethod,
                    payoutDetails
                })
            });
             if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit payout request.');
             setPayoutStatus('success');
        } catch(err) {
            setPayoutError(err instanceof Error ? err.message : 'Could not submit request.');
            setPayoutStatus('error');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-700">
                        <h1 className="text-2xl font-bold mb-4 text-center text-white">Filmmaker Dashboard</h1>
                        <p className="text-center text-sm text-gray-400 mb-6">Enter your name and the provided password to access your film analytics.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label htmlFor="directorName" className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                                <input type="text" id="directorName" value={directorName} onChange={(e) => setDirectorName(e.target.value)} className="form-input" required autoFocus />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" required />
                            </div>
                            {authError && <p className="text-sm text-red-400 text-center">{authError}</p>}
                            <button type="submit" className="submit-btn w-full !mt-6" disabled={authLoading}>{authLoading ? 'Verifying...' : 'Access Dashboard'}</button>
                        </form>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    
    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-2">Filmmaker Dashboard</h1>
                    <p className="text-lg text-gray-400 mb-8">Welcome, {directorName}. Here's how your films are performing.</p>
                    
                    {dataError && <p className="text-red-500 bg-red-900/50 p-4 rounded-md">{dataError}</p>}

                    {analytics && (
                        <div className="space-y-8">
                            {/* Payouts Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                    <h2 className="text-2xl font-bold text-green-400 mb-4">Your Earnings</h2>
                                    {payoutStatus === 'success' ? (
                                        <div className="text-center py-8">
                                            <h3 className="text-2xl font-bold text-green-400">Payout Request Sent!</h3>
                                            <p className="text-gray-300 mt-2">We've received your request and will process it within 3-5 business days. Thank you!</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handlePayoutRequest}>
                                            <p className="text-gray-400 mb-4">Request a payout for your current balance. Payments are processed within 3-5 business days.</p>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-1">Payout Method</label>
                                                    <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as any)} className="form-input">
                                                        <option>PayPal</option>
                                                        <option>Venmo</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                     <label htmlFor="payoutDetails" className="block text-sm font-medium text-gray-400 mb-1">
                                                        {payoutMethod === 'PayPal' ? 'PayPal Email' : payoutMethod === 'Venmo' ? 'Venmo Username' : 'Payment Details'}
                                                    </label>
                                                    <input type="text" id="payoutDetails" value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} required className="form-input" />
                                                </div>
                                            </div>
                                            <button type="submit" className="submit-btn w-full mt-6 bg-green-600 hover:bg-green-700" disabled={analytics.balance <= 0 || payoutStatus === 'submitting'}>
                                                {payoutStatus === 'submitting' ? 'Submitting...' : `Request Payout of ${formatCurrency(analytics.balance)}`}
                                            </button>
                                            {payoutStatus === 'error' && <p className="text-red-500 text-sm mt-2">{payoutError}</p>}
                                        </form>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center"><h3 className="text-gray-400 text-sm">Total Donations</h3><p className="text-3xl font-bold">{formatCurrency(analytics.totalDonations)}</p></div>
                                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center"><h3 className="text-gray-400 text-sm">Total Paid Out</h3><p className="text-3xl font-bold">{formatCurrency(analytics.totalPaidOut)}</p></div>
                                    <div className="bg-green-900/50 border border-green-700 p-6 rounded-lg text-center"><h3 className="text-green-300 text-sm">Current Balance</h3><p className="text-3xl font-bold text-green-300">{formatCurrency(analytics.balance)}</p></div>
                                </div>
                            </div>
                            
                            {/* Film by Film Breakdown */}
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Film Performance</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                                            <tr>
                                                <th className="py-3 pr-4">Title</th>
                                                <th className="py-3 px-4 text-center">Views</th>
                                                <th className="py-3 px-4 text-center">Likes</th>
                                                <th className="py-3 pl-4 text-center">Donations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.films.map(film => (
                                                <tr key={film.key} className="border-b border-gray-800 last:border-0">
                                                    <td className="py-4 pr-4 font-medium">{film.title}</td>
                                                    <td className="py-4 px-4 text-center">{film.views.toLocaleString()}</td>
                                                    <td className="py-4 px-4 text-center">{film.likes.toLocaleString()}</td>
                                                    <td className="py-4 pl-4 text-center">{formatCurrency(film.donations)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default FilmmakerPortalPage;
