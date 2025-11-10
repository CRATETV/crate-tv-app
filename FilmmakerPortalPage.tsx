import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { AnalyticsData, Movie } from './types';
import { fetchAndCacheLiveData } from './services/dataService';
import LoadingSpinner from './components/LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

type FilmPerformanceData = {
    key: string;
    title: string;
    director: string;
    views: number;
    likes: number;
    grossDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    grossAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
};

const FilmPerformanceCard: React.FC<{ film: FilmPerformanceData; poster: string }> = ({ film, poster }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex gap-4">
            <img src={poster} alt={film.title} className="w-24 h-36 object-cover rounded-md flex-shrink-0" />
            <div className="flex-grow">
                <h3 className="font-bold text-lg text-white">{film.title}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div><p className="text-gray-400 text-sm">Views</p><p className="font-bold text-xl">{film.views.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-sm">Likes</p><p className="font-bold text-xl">{film.likes.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-sm">Donations</p><p className="font-bold text-xl text-green-400">{formatCurrency(film.grossDonations)}</p></div>
                    <div><p className="text-gray-400 text-sm">Ad Revenue</p><p className="font-bold text-xl text-blue-400">{formatCurrency(film.grossAdRevenue)}</p></div>
                </div>
            </div>
        </div>
    );
};

const FilmmakerPortalPage: React.FC = () => {
    const [directorName, setDirectorName] = useState('');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            const password = sessionStorage.getItem('adminPassword');
            if (!password) {
                setError('Authentication error. Please log in again via the Admin Panel.');
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
                    fetchAndCacheLiveData()
                ]);

                if (!analyticsRes.ok) throw new Error('Failed to load analytics data.');
                const analyticsJson = await analyticsRes.json();
                setAnalyticsData(analyticsJson.analyticsData);
                
                setAllMovies(liveDataRes.data.movies);
                
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const filmPerformanceData = useMemo((): FilmPerformanceData[] => {
        if (!analyticsData || !allMovies || !directorName) return [];
        
        // FIX: Cast Object.values(allMovies) to Movie[] to resolve properties on 'unknown' type.
        const filmmakerFilms = (Object.values(allMovies) as Movie[]).filter(movie => 
            movie.director.toLowerCase().includes(directorName.toLowerCase())
        );

        return filmmakerFilms.map(movie => {
            const payoutInfo = analyticsData.filmmakerPayouts.find(p => p.movieTitle === movie.title);
            return {
                key: movie.key,
                title: movie.title,
                director: movie.director,
                views: analyticsData.viewCounts[movie.key] || 0,
                likes: analyticsData.movieLikes[movie.key] || 0,
                grossDonations: payoutInfo?.totalDonations || 0,
                grossAdRevenue: payoutInfo?.totalAdRevenue || 0,
                crateTvCut: payoutInfo?.crateTvCut || 0,
                filmmakerDonationPayout: payoutInfo?.filmmakerDonationPayout || 0,
                filmmakerAdPayout: payoutInfo?.filmmakerAdPayout || 0,
                totalFilmmakerPayout: payoutInfo?.totalFilmmakerPayout || 0,
            };
        });
    }, [analyticsData, allMovies, directorName]);

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
    
    if (!analyticsData) {
        return <div className="text-center p-8">Could not load analytics.</div>;
    }

    const totalFilmmakerPayout = filmPerformanceData.reduce((sum, film) => sum + film.totalFilmmakerPayout, 0);

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-28 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Filmmaker Dashboard</h1>
                    <p className="text-gray-400 mb-8">View performance analytics for your films on Crate TV.</p>
                    
                    {showInstructions && (
                        <div className="bg-blue-900/30 border border-blue-700 text-blue-200 text-sm rounded-lg p-4 mb-6 relative">
                            <h3 className="font-bold mb-2">How It Works:</h3>
                            <p>To view your analytics, enter your name exactly as it appears in the film credits. The dashboard will automatically find your films and calculate your earnings.</p>
                             <button onClick={() => setShowInstructions(false)} className="absolute top-2 right-2 text-blue-300 hover:text-white">&times;</button>
                        </div>
                    )}

                    <div className="mb-8">
                        <label htmlFor="directorName" className="block text-sm font-medium text-gray-400 mb-2">Enter Your Name</label>
                        <input
                            type="text"
                            id="directorName"
                            value={directorName}
                            onChange={(e) => setDirectorName(e.target.value)}
                            className="form-input"
                            placeholder="e.g., Jane Doe"
                        />
                    </div>
                    
                    {directorName && (
                        <>
                            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg mb-8 text-center">
                                <h2 className="text-gray-400 text-sm font-medium">Your Total Payout Earned</h2>
                                <p className="text-4xl font-bold text-green-400 mt-1">{formatCurrency(totalFilmmakerPayout)}</p>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">Your Film Performance</h2>
                            <div className="space-y-4">
                                {filmPerformanceData.length > 0 ? (
                                    filmPerformanceData.map(film => (
                                        <FilmPerformanceCard key={film.key} film={film} poster={allMovies[film.key]?.poster} />
                                    ))
                                ) : (
                                    <p className="text-gray-500">No films found for this director name.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer showPortalNotice={true} />
        </div>
    );
};

export default FilmmakerPortalPage;