import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, Movie, FilmmakerPayout } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import TopTenShareableImage from './TopTenShareableImage';
// import html2canvas from 'html2canvas'; // Removed for lazy-loading

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const TopFilmsTab: React.FC = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ critical: string | null }>({ critical: null });
    const [isGenerating, setIsGenerating] = useState(false);
    const shareableImageRef = useRef<HTMLDivElement>(null);
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
                poster: movie.poster,
            };
        }).sort((a, b) => b.likes - a.likes).slice(0, 10); // Sort by likes and take top 10
    }, [analyticsData, allMovies]);

    const handleShareImage = async () => {
        if (!shareableImageRef.current || isGenerating) return;

        setIsGenerating(true);
        try {
            // Dynamically import html2canvas only when needed for performance
            const { default: html2canvas } = await import('html2canvas');

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
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'cratetv_top10.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }

        } catch (error) {
            console.error("Error generating or sharing image:", error);
            alert("Sorry, we couldn't generate the shareable image. Please try again.");
        } finally {
            setIsGenerating(false);
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
                    onClick={handleShareImage}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm no-print disabled:bg-blue-800 disabled:cursor-wait"
                >
                    {isGenerating ? 'Generating Image...' : 'Share Image'}
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
            {topFilmsData.length > 0 && (
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={shareableImageRef}>
                        <TopTenShareableImage topFilms={topFilmsData} date={currentDate} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopFilmsTab;