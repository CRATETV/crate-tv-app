import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsData, Movie, FilmmakerPayout } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';
import TopTenShareableImage from './TopTenShareableImage';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

const TopFilmsTab: React.FC = () => {
    const { analytics, movies: allMovies, isLoading } = useFestival();
    const [isGenerating, setIsGenerating] = useState(false);
    const shareableImageRef = useRef<HTMLDivElement>(null);
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const topFilmsData = useMemo(() => {
        if (!analytics || !allMovies) return [];
        
        return (Object.values(allMovies) as Movie[]).map(movie => {
            const donations = analytics.filmmakerPayouts.find((p: FilmmakerPayout) => p.movieTitle === movie.title)?.totalDonations || 0;
            return {
                key: movie.key,
                title: movie.title,
                views: analytics.viewCounts[movie.key] || 0,
                likes: analytics.movieLikes?.[movie.key] || 0,
                donations: donations,
                poster: movie.poster,
            };
        }).sort((a, b) => b.views - a.views).slice(0, 10); 
    }, [analytics, allMovies]);

    const handleShareImage = async () => {
        if (!shareableImageRef.current || isGenerating) return;

        setIsGenerating(true);
        try {
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
                    title: 'Sector Priority: Top 10 Today',
                    text: `The most streamed films on Crate TV right now! #indiefilm #cratetv`,
                    files: [file],
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'cratetv_top10.png';
                link.click();
            }

        } catch (error) {
            console.error("Error generating image:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    if (!analytics) {
        return <div className="p-4 text-yellow-300 bg-yellow-900/50 border border-yellow-700 rounded-md">Could not load analytics data.</div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Sector Priority: Top 10 Today</h2>
                <button
                    onClick={handleShareImage}
                    disabled={isGenerating}
                    className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-4 rounded-md text-[10px] uppercase tracking-widest shadow-lg no-print disabled:bg-gray-800"
                >
                    {isGenerating ? 'Synthesizing...' : 'Export Asset'}
                </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">Live leaderboard ranking films by reach velocity (total views).</p>
            <div className="space-y-3">
                {topFilmsData.map((film, index) => (
                    <div key={film.key} className="group flex items-center bg-white/[0.02] border border-white/5 hover:border-red-600/30 transition-all rounded-2xl p-4">
                        <div className="flex items-center justify-center w-16 flex-shrink-0">
                            <span 
                                className="font-black text-4xl leading-none select-none text-gray-800 italic"
                                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)' }}
                            >
                                {index + 1}
                            </span>
                        </div>
                        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                            <img 
                                src={allMovies[film.key]?.poster} 
                                alt={film.title} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                        <div className="flex-grow min-w-0 pl-6">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{film.title}</h3>
                            <div className="flex gap-6 mt-1">
                                <div className="flex items-baseline gap-1.5">
                                    <p className="text-[8px] text-gray-500 uppercase font-black">Reach</p>
                                    <p className="font-bold text-xs text-red-500">{formatNumber(film.views)}</p>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <p className="text-[8px] text-gray-500 uppercase font-black">Sentiment</p>
                                    <p className="font-bold text-xs text-white">{formatNumber(film.likes)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {topFilmsData.length > 0 && (
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={shareableImageRef}>
                        <TopTenShareableImage topFilms={topFilmsData as any} date={currentDate} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopFilmsTab;