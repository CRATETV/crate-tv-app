import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

const TopTenPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});

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
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, movieKey: string) => {
        e.preventDefault();
        window.history.pushState({}, '', `/movie/${movieKey}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Top 10 Most Liked Films</h1>
                        <p className="text-lg text-gray-400">
                           Based on likes from the Crate TV community.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {topTenMovies.map((movie, index) => (
                            <a 
                                key={movie.key} 
                                href={`/movie/${movie.key}`} 
                                onClick={(e) => handleNavigate(e, movie.key)}
                                className="flex items-center bg-gray-800/50 hover:bg-gray-700/70 transition-colors duration-300 rounded-lg p-4"
                            >
                                <div className="text-4xl font-bold text-gray-500 w-16 text-center flex-shrink-0">{index + 1}</div>
                                <img src={movie.poster} alt={movie.title} className="w-16 h-24 object-cover rounded-md mx-4 flex-shrink-0" onContextMenu={(e) => e.preventDefault()} />
                                <div className="flex-grow min-w-0">
                                    <h2 className="text-lg font-bold text-white truncate">{movie.title}</h2>
                                    <p className="text-sm text-gray-400 truncate">by {movie.director}</p>
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                    <p className="font-bold text-white flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                        </svg>
                                        {(movie.likes || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">Likes</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default TopTenPage;
