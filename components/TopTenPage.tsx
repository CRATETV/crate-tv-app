import React, { useState, useEffect, useMemo } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

const TopTenPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});

    useEffect(() => {
        const loadData = async () => {
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
            // FIX: Add explicit type to the 'movie' parameter to resolve TypeScript inference issue.
            .filter((movie: Movie) => (movie.likes || 0) > 0) // Only include movies with at least one like
            // FIX: Add explicit types to 'a' and 'b' parameters to resolve TypeScript inference issues.
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
            <div className="max-w-2xl mx-auto">
                <header className="text-center mb-8">
                    <img
                        src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png"
                        alt="Crate TV Logo"
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
                                <span className="text-4xl sm:text-5xl font-black text-gray-600 w-16 text-center">{index + 1}</span>
                                <img src={movie.poster} alt={movie.title} className="w-16 h-24 object-cover rounded-md flex-shrink-0" onContextMenu={(e) => e.preventDefault()} />
                                <div className="flex-grow">
                                    <h2 className="text-lg font-bold text-white leading-tight">{movie.title}</h2>
                                    <p className="text-sm text-gray-400">{movie.director}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-bold text-white flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                        </svg>
                                        {(movie.likes || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">Likes</p>
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
    );
};

export default TopTenPage;