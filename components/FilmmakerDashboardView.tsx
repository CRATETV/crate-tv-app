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

const FilmPerformanceCard: React.FC<{ film: FilmmakerFilmPerformance; poster: string }> = ({ film, poster }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex flex-col md:flex-row gap-6">
            <img src={`/api/proxy-image?url=${encodeURIComponent(poster)}`} alt={film.title} className="w-32 h-48 object-cover rounded-md flex-shrink-0 self-center md:self-start shadow-lg" crossOrigin="anonymous"/>
            <div className="flex-grow">
                <h3 className="font-bold text-xl text-white">{film.title}</h3>
                
                {/* Engagement Stats */}
                <div className="grid grid-cols-3 gap-4 my-4 text-center">
                    <div title="Total Views">
                        <p className="text-gray-400 text-sm flex items-center justify-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            Views
                        </p>
                        <p className="font-bold text-2xl">{film.views.toLocaleString()}</p>
                    </div>
                    <div title="Total Likes">
                        <p className="text-gray-400 text-sm flex items-center justify-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                            Likes
                        </p>
                        <p className="font-bold text-2xl text-red-400">{film.likes.toLocaleString()}</p>
                    </div>
                    <div title="Added to My List">
                        <p className="text-gray-400 text-sm flex items-center justify-center gap-1.5">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            My List
                        </p>
                        <p className="font-bold text-2xl text-blue-400">{film.watchlistAdds.toLocaleString()}</p>
                    </div>
                </div>

                {/* Financials */}
                <div className="bg-gray-900/50 p-4 rounded-md space-y-2 border border-gray-700">
                    <h4 className="font-semibold text-gray-300">Earnings Breakdown</h4>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Donation Earnings (70% of {formatCurrency(film.grossDonations)})</span>
                        <span className="font-semibold text-green-400">{formatCurrency(film.netDonationEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Ad Revenue Earnings (50% of {formatCurrency(film.grossAdRevenue)})</span>
                        <span className="font-semibold text-green-400">{formatCurrency(film.netAdEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-600 pt-2 mt-2">
                        <span className="text-white">Your Total Earnings</span>
                        <span className="text-green-400">{formatCurrency(film.totalEarnings)}</span>
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
    const [isGenerating, setIsGenerating] = useState(false);
    const shareableImageRef = useRef<HTMLDivElement>(null);
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }));

        const fetchAnalyticsData = async () => {
            if (!user?.name) {
                return;
            };

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

    const topTenMovies = useMemo(() => {
        if (!allMovies) return [];
        return Object.values(allMovies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [allMovies]);

    const handleShareTopTen = async () => {
        if (!shareableImageRef.current || isGenerating) return;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(shareableImageRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 1,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image blob.');

            const file = new File([blob], 'cratetv_top10.png', { type: 'image/png' });
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Top 10 on Crate TV',
                    text: `Check out the current Top 10 films on Crate TV! #indiefilm #cratetv`,
                    files: [file],
                });
            } else {
                alert("Sharing is not supported on this browser. Try downloading the image instead from the public Top 10 page.");
            }
        } catch (error) {
            console.error("Error sharing image:", error);
            alert("Sorry, we couldn't generate the shareable image.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading || isFestivalLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
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
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard title="Available Balance" value={formatCurrency(analytics.balance)} />
                        <StatCard title="Total Paid Out" value={formatCurrency(analytics.totalPaidOut)} />
                        <StatCard title="Total Ad Earnings" value={formatCurrency(analytics.totalAdRevenue)} />
                        <StatCard title="Total Donation Earnings" value={formatCurrency(analytics.totalDonations)} />
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-xl font-bold text-white">Payouts</h2>
                            <button 
                                onClick={() => setIsExplanationModalOpen(true)}
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="How payouts work"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 18.5v.01" />
                                </svg>
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
                        <div className="space-y-6">
                            {analytics.films && analytics.films.map(film => {
                                const movieDetails = allMovies[film.key];
                                if (!movieDetails) {
                                    console.warn(`Movie with key ${film.key} not found in allMovies context.`);
                                    return null;
                                }
                                return <FilmPerformanceCard key={film.key} film={film} poster={movieDetails.poster} />;
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white">Top 10 on Crate TV</h2>
                            <button onClick={handleShareTopTen} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-xs">
                                {isGenerating ? '...' : 'Share'}
                            </button>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                            {topTenMovies.length > 0 ? topTenMovies.map((movie, index) => (
                                <div key={movie.key} className="flex items-center gap-4 py-2 border-b border-gray-700 last:border-b-0">
                                    <span className="font-black text-3xl text-gray-600 w-8 text-center flex-shrink-0">{index + 1}</span>
                                    <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="w-10 h-14 object-cover rounded-md flex-shrink-0" crossOrigin="anonymous"/>
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
             {/* Hidden component for generating the shareable image */}
            {topTenMovies.length > 0 && (
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={shareableImageRef}>
                        <TopTenShareableImage topFilms={topTenMovies} date={currentDate} />
                    </div>
                </div>
            )}
        </>
    );
};

export default FilmmakerDashboardView;