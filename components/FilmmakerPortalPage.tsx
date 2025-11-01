import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { FilmmakerAnalytics, PayoutRequest } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'requested'>('idle');

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user || !user.name) return;

            setIsLoading(true);
            setError('');
            try {
                // The API no longer needs a password; it's protected by the route now.
                // We pass the authenticated user's name to get their specific data.
                const res = await fetch('/api/get-filmmaker-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directorName: user.name }),
                });
                if (!res.ok) throw new Error((await res.json()).error || 'Failed to load analytics.');
                const data = await res.json();
                setAnalytics(data.analytics);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [user]);

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
    
    if (!analytics || !user) return <LoadingSpinner />; // Should be covered by loading state, but a good safeguard

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard for {user.name}</h1>
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