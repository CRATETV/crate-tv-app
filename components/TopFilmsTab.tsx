import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsData, Movie, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const TopFilmsTab: React.FC = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ critical: string | null }>({ critical: null });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const password = sessionStorage.getItem('adminPassword');
            if (!password) {
                setError({ critical: 'Authentication error. Please log in again.' });
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
                    fetchAndCacheLiveData({ force: true })
                ]);
                
                const analyticsJson = await analyticsRes.json();
                if (analyticsJson.errors?.critical) throw new Error(analyticsJson.errors.critical);
                
                setAnalyticsData(analyticsJson.analyticsData);
                setAllMovies(liveDataRes.data.movies);
                
            } catch (err) {
                setError({ critical: err instanceof Error ? err.message : 'An unknown error occurred during data fetch.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const topFilmsData = useMemo(() => {
        if (!analyticsData || !allMovies) return [];
        
        const filmmakerPayouts = analyticsData.filmmakerPayouts || [];
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const donations = filmmakerPayouts.find((p: FilmmakerPayout) => p.movieTitle === movie.title)?.totalDonations || 0;
            return {
                key: movie.key,
                title: movie.title,
                views: analyticsData.viewCounts[movie.key] || 0,
                likes: analyticsData.movieLikes[movie.key] || 0,
                donations: donations,
            };
        }).sort((a, b) => b.likes - a.likes).slice(0, 10); // Sort by likes and take top 10
    }, [analyticsData, allMovies]);

    const handleShare = async () => {
        if (!topFilmsData || topFilmsData.length === 0) return;

        const title = 'Top 10 Films on Crate TV';
        const url = `${window.location.origin}/top-ten`;
        const text = topFilmsData.map((film, index) => `${index + 1}. ${film.title}`).join('\n');
        
        const shareData = {
            title,
            text: `Check out the current Top 10 films on Crate TV!\n\n${text}`,
            url,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.text}\n\nView the list here: ${shareData.url}`);
                alert('Top 10 list and link copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing Top 10 list:', error);
            alert('Could not share the list.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error.critical) {
        return <div className="p-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error.critical}</div>
    }

    if (!analyticsData) {
        return <div className="p-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 rounded-md">Could not load analytics data to generate top films list.</div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Top 10 Films by Likes</h2>
                <button
                    onClick={handleShare}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm no-print"
                >
                    Share List
                </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">This list ranks all films by their total like count, providing a clear view of audience favorites.</p>
            <div className="space-y-2">
                {topFilmsData.map((film, index) => (
                    <div key={film.key} className="group flex items-center bg-gray-800/60 rounded-lg p-3">
                        <div className="flex items-center justify-center w-24 flex-shrink-0">
                            <span 
                                className="font-black text-6xl md:text-7xl leading-none select-none text-gray-700"
                                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                            >
                                {index + 1}
                            </span>
                        </div>
                        <div className="relative w-16 h-24 flex-shrink-0 rounded-md overflow-hidden shadow-lg">
                            <img 
                                src={allMovies[film.key]?.poster} 
                                alt={film.title} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                        <div className="flex-grow min-w-0 pl-6">
                            <h3 className="text-lg font-bold text-white truncate">{film.title}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 text-center sm:text-left">
                                <div>
                                    <p className="text-gray-400 text-xs">Likes</p>
                                    <p className="font-bold text-lg text-red-400">{formatNumber(film.likes)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Views</p>
                                    <p className="font-bold text-lg">{formatNumber(film.views)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Donations</p>
                                    <p className="font-bold text-lg text-green-400">{formatCurrency(film.donations)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopFilmsTab;