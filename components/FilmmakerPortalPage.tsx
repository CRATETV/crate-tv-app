import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { FilmmakerAnalytics, PayoutRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';

const FILMMAKER_PASSWORD = 'cratedirector';
const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

const PayoutModal: React.FC<{ balance: number; directorName: string; onClose: () => void; onComplete: () => void; }> = ({ balance, directorName, onClose, onComplete }) => {
    const [method, setMethod] = useState<'PayPal' | 'Venmo' | 'Other'>('PayPal');
    const [details, setDetails] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details) {
            setError('Please provide your payment details.');
            return;
        }
        setStatus('submitting');
        setError('');
        try {
            const res = await fetch('/api/request-payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directorName, password: FILMMAKER_PASSWORD, amount: balance, payoutMethod: method, payoutDetails: details }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit request.');
            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
            setStatus('error');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Request Payout</h2>
                        <p className="text-gray-300 mb-4">You are requesting a payout of <span className="font-bold text-green-400">{formatCurrency(balance)}</span>.</p>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Payout Method</label>
                                <select value={method} onChange={e => setMethod(e.target.value as any)} className="form-input">
                                    <option>PayPal</option>
                                    <option>Venmo</option>
                                    <option>Other</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {method === 'PayPal' ? 'PayPal Email' : method === 'Venmo' ? 'Venmo Username' : 'Payout Instructions'}
                                </label>
                                <input type="text" value={details} onChange={e => setDetails(e.target.value)} className="form-input" required />
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
                        <button type="submit" className="submit-btn w-full mt-6" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting...' : 'Confirm Request'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const FilmmakerPortalPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [filmmakerName, setFilmmakerName] = useState('');
    const [error, setError] = useState('');
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'requested'>('idle');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch('/api/get-filmmaker-analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directorName: filmmakerName, password }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Login failed.');
            const data = await res.json();
            setAnalytics(data.analytics);
            setIsAuthenticated(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNavigateHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                 <style>{`
                    body {
                        background-image: url('https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper.png');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                    }
                `}</style>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                <header className="absolute top-0 left-0 p-8 z-10">
                    <a href="/" onClick={handleNavigateHome}><img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-32 h-auto" /></a>
                </header>
                <main className="relative flex-grow flex items-center justify-center p-4">
                     <div className="w-full max-w-md bg-black/70 backdrop-blur-md p-8 rounded-lg">
                        <h1 className="text-3xl font-bold text-center text-white mb-2">Filmmaker Dashboard</h1>
                        <p className="text-center text-gray-400 mb-6 text-sm">Access your film's performance analytics.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="text" value={filmmakerName} onChange={e => setFilmmakerName(e.target.value)} placeholder="Your Full Name (Director/Producer)" className="form-input" required />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="form-input"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
                                    )}
                                </button>
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button type="submit" className="submit-btn w-full mt-4" disabled={isLoading}>{isLoading ? 'Loading...' : 'View My Dashboard'}</button>
                        </form>
                    </div>
                </main>
            </div>
        );
    }
    
    if (!analytics) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard for {filmmakerName}</h1>
                    <p className="text-gray-400 mb-8">View performance analytics for your films on Crate TV.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                        <StatCard title="Total Donations" value={formatCurrency(analytics.totalDonations)} />
                        <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Payouts</h2>
                            {payoutStatus === 'requested' ? (
                                <p className="text-green-400">Your payout request has been sent! Please allow 3-5 business days for processing.</p>
                            ) : analytics.balance > 100 ? (
                                <button onClick={() => setIsPayoutModalOpen(true)} className="submit-btn">Request Payout</button>
                            ) : (
                                <p className="text-gray-400">Your balance must be at least $1.00 to request a payout.</p>
                            )}
                        </div>
                         <a href="/top-ten" target="_blank" rel="noopener noreferrer" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">
                            View Top 10 Films
                        </a>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Film Performance</h2>
                        <div className="space-y-4">
                            {analytics.films.map(film => (
                                <div key={film.key} className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold text-lg text-white">{film.title}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2 text-center">
                                        <div><p className="text-gray-400 text-sm">Views</p><p className="font-bold text-xl">{film.views.toLocaleString()}</p></div>
                                        <div><p className="text-gray-400 text-sm">Likes</p><p className="font-bold text-xl">{film.likes.toLocaleString()}</p></div>
                                        <div><p className="text-gray-400 text-sm">Donations</p><p className="font-bold text-xl text-green-400">{formatCurrency(film.donations)}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer showPortalNotice={true} showActorLinks={true} />
            {isPayoutModalOpen && (
                <PayoutModal 
                    balance={analytics.balance} 
                    directorName={filmmakerName} 
                    onClose={() => setIsPayoutModalOpen(false)} 
                    onComplete={() => { setIsPayoutModalOpen(false); setPayoutStatus('requested'); }} 
                />
            )}
        </div>
    );
};

export default FilmmakerPortalPage;