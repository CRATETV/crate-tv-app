import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FilmmakerAnalytics, Movie, FilmmakerFilmPerformance } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PayoutExplanationModal from './PayoutExplanationModal';
import TopTenShareableImage from './TopTenShareableImage';
import html2canvas from 'html2canvas';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg text-center hover:bg-gray-800/80 transition-colors">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
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

const FilmPerformanceCard: React.FC<{ film: FilmmakerFilmPerformance; poster: string }> = ({ film, poster }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex flex-col md:flex-row gap-6 hover:border-gray-500 transition-colors">
            <img src={`/api/proxy-image?url=${encodeURIComponent(poster)}`} alt={film.title} className="w-32 h-48 object-cover rounded-md flex-shrink-0 self-center md:self-start shadow-lg" crossOrigin="anonymous"/>
            <div className="flex-grow">
                <h3 className="font-black text-2xl text-white uppercase tracking-tighter">{film.title}</h3>
                
                <div className="grid grid-cols-3 gap-4 my-4 text-center">
                    <div title="Total Views">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Views</p>
                        <p className="font-bold text-2xl">{film.views.toLocaleString()}</p>
                    </div>
                    <div title="Total Likes">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Likes</p>
                        <p className="font-bold text-2xl text-red-500">{film.likes.toLocaleString()}</p>
                    </div>
                    <div title="Added to My List">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Watchlisted</p>
                        <p className="font-bold text-2xl text-purple-500">{film.watchlistAdds.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-xl space-y-2 border border-white/5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Net Donations</span>
                        <span className="font-black text-green-400">{formatCurrency(film.netDonationEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Net Ad Revenue</span>
                        <span className="font-black text-green-400">{formatCurrency(film.netAdEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black border-t border-white/10 pt-2 mt-2">
                        <span className="text-white uppercase tracking-tighter">Total</span>
                        <span className="text-green-500">{formatCurrency(film.totalEarnings)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const FilmmakerDashboardView: React.FC = () => {
    const { user } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading } = useFestival();
    const [analytics, setAnalytics] = useState<FilmmakerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState<'idle' | 'requested'>('idle');

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            if (!user?.name) return;
            setIsLoading(true);
            setError('');
            try {
                const analyticsRes = await fetch('/api/get-filmmaker-analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directorName: user.name }),
                });

                if (!analyticsRes.ok) throw new Error((await analyticsRes.json()).error || 'Failed to load analytics.');
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData.analytics);
                
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalyticsData();
    }, [user]);

    if (isLoading || isFestivalLoading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 p-8 text-center">{error}</div>;
    if (!user || !analytics) return <LoadingSpinner />;

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                <StatCard title="Ad Revenue Share" value={formatCurrency(analytics.totalAdRevenue)} />
                <StatCard title="Tips Received" value={formatCurrency(analytics.totalDonations)} />
            </div>

            <div className="bg-gradient-to-br from-pink-600/10 to-transparent border border-pink-500/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Earnings & Payouts</h2>
                        <button onClick={() => setIsExplanationModalOpen(true)} className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                    {payoutStatus === 'requested' ? (
                        <div className="bg-green-500/20 text-green-400 p-4 rounded-xl border border-green-500/30 font-bold">Payout request sent! Please allow 3-5 business days.</div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex-grow">
                                <p className="text-gray-400 leading-relaxed">Your balance updates in real-time as viewers donate and stream your work. We process payouts via PayPal or Venmo.</p>
                            </div>
                            <button 
                                onClick={() => setIsPayoutModalOpen(true)} 
                                disabled={analytics.balance < 100}
                                className="w-full sm:w-auto bg-white text-black font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-sm hover:bg-gray-200 transition-all disabled:opacity-20"
                            >
                                Withdraw {formatCurrency(analytics.balance)}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">Film Statistics</h2>
                <div className="space-y-6">
                    {analytics.films && analytics.films.map(film => (
                        <FilmPerformanceCard key={film.key} film={film} poster={allMovies[film.key]?.poster || ''} />
                    ))}
                </div>
            </div>

            {isPayoutModalOpen && user.name && (
                <PayoutModal balance={analytics.balance} directorName={user.name} onClose={() => setIsPayoutModalOpen(false)} onComplete={() => { setIsPayoutModalOpen(false); setPayoutStatus('requested'); }} />
            )}
            {isExplanationModalOpen && <PayoutExplanationModal onClose={() => setIsExplanationModalOpen(false)} />}
        </div>
    );
};

export default FilmmakerDashboardView;