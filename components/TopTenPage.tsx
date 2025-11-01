import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext';

const TopTenPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [isDownloading, setIsDownloading] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth(); // Get user auth state
    const [isAdmin, setIsAdmin] = useState(false); // State to track admin status

    useEffect(() => {
        // Check for admin status from session storage when the component mounts.
        const isAdminAuthenticated = sessionStorage.getItem('isAdminAuthenticated') === 'true';
        setIsAdmin(isAdminAuthenticated);

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
        // Get all movies, filter out any potential null/undefined values
        const allValidMovies = Object.values(movies).filter((movie): movie is Movie => !!movie);
        
        // Sort all movies by likes, descending. Movies with 0 or undefined likes will be at the end.
        const sortedMovies = allValidMovies.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        
        // Take the top 10 from the sorted list.
        return sortedMovies.slice(0, 10);
    }, [movies]);

    const handleDownload = async () => {
        if (!captureRef.current || isDownloading) return;

        setIsDownloading(true);

        try {
            captureRef.current.style.border = '1px solid #374151';
            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#111827',
                useCORS: true, 
                scale: 2,
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
            <div className="max-w-3xl mx-auto">
                 <div className="text-center mb-6 sticky top-4 z-20">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
                    >
                        {isDownloading ? 'Generating...' : 'Download as Image'}
                    </button>
                </div>

                <div ref={captureRef} className="bg-gradient-to-br from-gray-900 via-purple-900/40 to-black p-4 sm:p-6 rounded-xl">
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
                                <div key={movie.key} className="flex flex-col p-4 bg-gray-900/50 border border-gray-700 rounded-lg shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <span className="text-5xl font-black text-purple-400 w-16 text-center flex-shrink-0">{index + 1}</span>
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
                                        {/* Conditionally render the like count only for admins */}
                                        {isAdmin && (
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-lg text-white flex items-center gap-1.5">
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                    </svg>
                                                    {(movie.likes || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Conditionally render synopsis for guest users */}
                                    {!user && movie.synopsis && (
                                        <div className="border-t border-gray-700 pt-3 mt-4">
                                            <p className="text-sm text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                                        </div>
                                    )}
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