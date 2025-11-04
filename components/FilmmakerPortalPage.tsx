import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import { FilmmakerAnalytics, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { fetchAndCacheLiveData } from '../services/dataService';
import PayoutExplanationModal from './PayoutExplanationModal';
import AwardCard from './AwardCard';
import FilmmakerForum from './FilmmakerForum';

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
    const [activeTab, setActiveTab] = useState('analytics');
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'requested'>('idle');

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user || !user.name) {
                return;
            };

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

    const filmsWithAwards = useMemo(() => {
        if (!analytics || !allMovies) return [];
        return analytics.films
            .map(filmPerformance => allMovies[filmPerformance.key])
            .filter((movie): movie is Movie => !!(movie && movie.awards && movie.awards.length > 0));
    }, [analytics, allMovies]);

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );


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
    
    if (!user || !analytics) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
            <main className="flex-grow pt-28 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard for {user.name}</h1>
                    <p className="text-gray-400 mb-8">Your central hub for analytics, awards, and community.</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                        <TabButton tabName="analytics" label="Analytics" />
                        <TabButton tabName="awards" label="Awards" />
                        <TabButton tabName="forum" label="Community Forum" />
                        <TabButton tabName="events" label="Live Events" />
                    </div>

                    {activeTab === 'analytics' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                                <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                                <StatCard title="Total Ad Revenue" value={formatCurrency(analytics.totalAdRevenue)} />
                                <StatCard title="Total Donations" value={formatCurrency(analytics.totalDonations)} />
                            </div>
                             <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <h2 className="text-xl font-bold text-white">Payouts</h2>
                                    <button 
                                        onClick={() => setIsExplanationModalOpen(true)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                        aria-label="How payouts work"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 18.5v.01" /></svg>
                                    </button>
                                </div>
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
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-center">
                                                <div><p className="text-gray-400 text-sm">Views</p><p className="font-bold text-xl">{film.views.toLocaleString()}</p></div>
                                                <div><p className="text-gray-400 text-sm">Likes</p><p className="font-bold text-xl">{film.likes.toLocaleString()}</p></div>
                                                <div><p className="text-gray-400 text-sm">Donations</p><p className="font-bold text-xl text-green-400">{formatCurrency(film.donations)}</p></div>
                                                <div><p className="text-gray-400 text-sm">Ad Revenue</p><p className="font-bold text-xl text-blue-400">{formatCurrency(film.adRevenue)}</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'awards' && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Your Awards</h2>
                            {filmsWithAwards.length > 0 ? (
                                <div className="space-y-6">
                                    {filmsWithAwards.map(movie =>
                                        movie.awards!.map(award => (
                                            <AwardCard key={`${movie.key}-${award}`} movie={movie} award={award} />
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    <p>No awards to display yet. Keep creating!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'forum' && (
                        <FilmmakerForum user={user} />
                    )}

                    {activeTab === 'events' && (
                        <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg text-center">
                             <h2 className="text-2xl font-bold text-white mb-4">Director's Cut Live Events</h2>
                             <p className="text-gray-400 mb-6">Coming soon! An exclusive space for live film premieres followed by an interactive Q&A with the director. Get ready to connect with your audience like never before.</p>
                             <div className="text-purple-400 font-bold">Stay Tuned for Announcements</div>
                        </div>
                    )}
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
            {isExplanationModalOpen && (
                <PayoutExplanationModal onClose={() => setIsExplanationModalOpen(false)} />
            )}
        </div>
    );
};

export default FilmmakerPortalPage;