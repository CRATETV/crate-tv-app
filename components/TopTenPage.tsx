import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import html2canvas from 'html2canvas';

const TopTenPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [isDownloading, setIsDownloading] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
            } catch (error) {
                console.error("Failed to load data for Top Ten page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const topTenMovies = useMemo(() => {
        const allValidMovies = Object.values(movies).filter((movie): movie is Movie => !!movie);
        const sortedMovies = allValidMovies.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        return sortedMovies.slice(0, 10);
    }, [movies]);

    const handleDownload = async () => {
        if (!captureRef.current || isDownloading) return;

        setIsDownloading(true);

        try {
            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#111827', // A dark color matching the gradient
                useCORS: true, 
                scale: 2, // Higher resolution for better quality
            });

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            const date = new Date().toISOString().split('T')[0];
            link.download = `crate-tv-top-10-${date}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to download image:", error);
            alert("Sorry, there was an error creating the image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, movieKey: string) => {
        e.preventDefault();
        window.history.pushState({}, '', `/movie/${movieKey}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const RankedCard: React.FC<{ movie: Movie, rank: number }> = ({ movie, rank }) => (
       <a href={`/movie/${movie.key}`} onClick={(e) => handleNavigate(e, movie.key)} className="group relative w-full aspect-[16/9] flex items-center justify-center">
         <span 
             className="font-black text-[10rem] text-gray-800/80 -mr-16 select-none z-0 transition-transform duration-300 group-hover:scale-105"
             style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}
           >
             {rank}
         </span>
         <div className="relative z-10 w-32 h-48 block group flex-shrink-0">
             <img 
                 src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                 alt={movie.title} 
                 crossOrigin="anonymous"
                 className="w-full h-full object-cover rounded-md shadow-lg transition-transform duration-300 group-hover:scale-110" 
                 onContextMenu={(e) => e.preventDefault()} 
             />
         </div>
       </a>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                 <div className="text-center mb-6 sticky top-4 z-20">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
                    >
                        {isDownloading ? 'Generating...' : 'Download as Image'}
                    </button>
                </div>

                <div ref={captureRef} className="bg-gradient-to-br from-[#0c1a4d] via-[#111827] to-[#4d1a2c] p-4 sm:p-8 rounded-xl">
                    <header className="text-center mb-8">
                        <img
                            src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`}
                            alt="Crate TV Logo"
                            crossOrigin="anonymous"
                            className="mx-auto w-40 h-auto mb-4"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Top 10 on Crate TV Today</h1>
                    </header>

                    {topTenMovies.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
                            {topTenMovies.map((movie, index) => (
                                <RankedCard key={movie.key} movie={movie} rank={index + 1} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                            <p>No liked movies yet. Be the first to like a film!</p>
                        </div>
                    )}

                    <footer className="text-center mt-8 pt-4 border-t border-gray-700/50">
                        <p className="text-sm text-gray-400">Updated {currentDate}</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default TopTenPage;