import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import { FilmmakerAnalytics, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { fetchAndCacheLiveData } from '../services/dataService';

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
                // The password here is a simple secondary check for the API endpoint itself
                body: JSON.stringify({ directorName, password: 'cratedirector', amount: balance, payoutMethod: method, payoutDetails: details }),
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
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'requested'>('idle');

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user || !user.name) return;

            setIsLoading(true);
            setError('');
            try {
                const [analyticsRes, liveDataRes] = await Promise.all([
                    fetch('/api/get-filmmaker-analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ directorName: user.name }),
                    }),
                    fetchAndCacheLiveData()
                ]);

                if (!analyticsRes.ok) throw new Error((await analyticsRes.json()).error || 'Failed to load analytics.');
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData.analytics);
                
                setAllMovies(liveDataRes.data.movies);
                
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [user]);

    const topTenMovies = useMemo(() => {
        if (!allMovies) return [];
        return Object.values(allMovies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [allMovies]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <p className="text-red-500">{error}</p>
                </main>
            </div>
        );
    }
    
    if (!analytics || !user) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard for {user.name}</h1>
                    <p className="text-gray-400 mb-8">View performance analytics for your films on Crate TV.</p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                                <StatCard title="Total Donations" value={formatCurrency(analytics.totalDonations)} />
                                <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                <h2 className="text-xl font-bold text-white mb-2">Payouts</h2>
                                {payoutStatus === 'requested' ? (
                                    <p className="text-green-400">Your payout request has been sent! Please allow 3-5 business days for processing.</p>
                                ) : analytics.balance > 100 ? (
                                    <button onClick={() => setIsPayoutModalOpen(true)} className="submit-btn">Request Payout</button>
                                ) : (
                                    <p className="text-gray-400">Your balance must be at least $1.00 to request a payout.</p>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Your Film Performance</h2>
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

                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Top 10 on Crate TV</h2>
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                                    {topTenMovies.length > 0 ? topTenMovies.map((movie, index) => (
                                        <div key={movie.key} className="flex items-center gap-4 py-2 border-b border-gray-700 last:border-b-0">
                                            <span className="font-black text-3xl text-gray-600 w-8 text-center flex-shrink-0">{index + 1}</span>
                                            <img src={movie.poster} alt="" className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white text-sm truncate">{movie.title}</p>
                                                <p className="text-xs text-gray-400 truncate">{movie.director}</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-gray-500 text-center py-4">Top 10 list is currently unavailable.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer showPortalNotice={true} showActorLinks={true} />
            {isPayoutModalOpen && user.name && (
                <PayoutModal 
                    balance={analytics.balance} 
                    directorName={user.name} 
                    onClose={() => setIsPayoutModalOpen(false)} 
                    onComplete={() => { setIsPayoutModalOpen(false); setPayoutStatus('requested'); }} 
                />
            )}
        </div>
    );
};

export default FilmmakerPortalPage;