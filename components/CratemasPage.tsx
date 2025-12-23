
import React, { useState, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { Movie, Category } from '../types';
import { MovieCard } from './MovieCard';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import { categoriesData } from '../constants';

const CratemasPage: React.FC = () => {
    const { isLoading: isFestivalLoading, movies, categories, settings } = useFestival();
    const { watchlist, toggleWatchlist, likedMovies, toggleLikeMovie, watchedMovies } = useAuth();

    // Advanced flexibility: Find Cratemas by key OR by title (case-insensitive)
    const cratemasCategory = useMemo(() => {
        if (categories.cratemas) return categories.cratemas;
        // Search all categories for one titled "Cratemas"
        const found = (Object.values(categories) as Category[]).find(c => c.title && c.title.toLowerCase() === 'cratemas');
        return found || categoriesData.cratemas;
    }, [categories]);

    const cratemasMovies = useMemo(() => {
        if (!cratemasCategory || !cratemasCategory.movieKeys) return [];
        return cratemasCategory.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, cratemasCategory]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isFestivalLoading) {
        return <LoadingSpinner />;
    }

    const isSeasonActive = settings.isHolidayModeActive && cratemasMovies.length > 0;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#042116]">
            {/* Snowfall simulated background */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/snow-texture.png')] bg-repeat animate-[pulse_10s_infinite]"></div>
            
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={true}
                showNavLinks={true}
            />

            <main className="flex-grow pb-24 md:pb-0 relative z-10">
                {/* Hero Section */}
                <div className="relative py-24 md:py-32 bg-gradient-to-b from-[#064e3b] to-[#042116] overflow-hidden">
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10 max-w-4xl mx-auto text-center px-4 animate-[fadeIn_0.8s_ease-out]">
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-white to-green-600 mb-6 drop-shadow-[0_0_35px_rgba(255,0,0,0.6)]">
                            Cratemas
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-medium drop-shadow-md">
                           Our curated collection of holiday stories, independent spirit, and cinematic cheer.
                        </p>
                    </div>
                </div>

                {/* Movie Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-16">
                    {isSeasonActive ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
                            {cratemasMovies.map(movie => (
                                <div key={movie.key} className="hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] rounded-lg transition-all duration-300 transform hover:scale-105">
                                    <MovieCard 
                                        movie={movie} 
                                        onSelectMovie={handleSelectMovie} 
                                        isOnWatchlist={watchlist.includes(movie.key)}
                                        onToggleWatchlist={toggleWatchlist}
                                        isLiked={likedMovies.includes(movie.key)}
                                        onToggleLike={toggleLikeMovie}
                                        isWatched={watchedMovies.includes(movie.key)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <div className="text-6xl mb-6 animate-bounce">🎄</div>
                            <p className="text-center text-gray-400 text-xl font-bold">The Cratemas collection is resting. Check back during the holidays!</p>
                        </div>
                    )}
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={handleMobileSearch}
            />
        </div>
    );
};

export default CratemasPage;
