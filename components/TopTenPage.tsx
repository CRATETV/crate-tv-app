import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import html2canvas from 'html2canvas';

const TopTenPage: React.FC = () => {
    // Page content state
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
        return Object.values(movies)
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

    const handleDownload = async () => {
        if (!captureRef.current || isDownloading) return;

        setIsDownloading(true);

        try {
            // Temporarily add a border for better framing, then remove it
            captureRef.current.style.border = '1px solid #374151';
            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#000000',
                useCORS: true, 
                scale: 2, // Increase resolution for better quality
            });
            captureRef.current.style.border = 'none';

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

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-6 rounded-md transition-colors"
                    >
                        {isDownloading ? 'Generating...' : 'Download as Image'}
                    </button>
                </div>

                <div ref={captureRef} className="bg-black p-4 sm:p-6">
                    <header className="text-center mb-8">
                        <img
                            src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`}
                            alt="Crate TV Logo"
                            crossOrigin="anonymous"
                            className="mx-auto w-48 h-auto mb-2"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Top 10 Most Liked Films</h1>
                        <p className="text-sm text-gray-400 mt-2">As of {new Date().toLocaleDateString()}</p>
                    </header>

                    {topTenMovies.length > 0 ? (
                        <div className="space-y-4">
                            {topTenMovies.map((movie, index) => (
                                <div key={movie.key} className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                                    <span className="text-4xl sm:text-5xl font-black text-purple-400 w-16 text-center">{index + 1}</span>
                                    <img 
                                        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                                        alt={movie.title} 
                                        crossOrigin="anonymous"
                                        className="w-16 h-24 object-cover rounded-md flex-shrink-0" 
                                        onContextMenu={(e) => e.preventDefault()} 
                                    />
                                    <div className="flex-grow">
                                        <h2 className="text-lg font-bold text-white leading-tight">{movie.title}</h2>
                                        <p className="text-sm text-gray-400">{movie.director}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                            <p>No liked movies yet. Be the first to like a film!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopTenPage;
