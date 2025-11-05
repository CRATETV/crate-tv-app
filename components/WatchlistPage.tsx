

import React, { useMemo } from 'react';
import Header from './Header';
import BackToTopButton from './BackToTopButton';
import { MovieCard } from './MovieCard';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';

const WatchlistPage: React.FC = () => {
    const { user, watchlist } = useAuth();
    const { isLoading, movies } = useFestival();

    const watchlistMovies = useMemo(() => {
        return watchlist
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, watchlist]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
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
                showNavLinks={true}
            />
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">My List</h1>
                    {watchlistMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {watchlistMovies.map(movie => (
                                <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-semibold text-gray-300">Your List is Empty</h2>
                            <p className="text-gray-500 mt-2">Add shows and movies to your list to watch them later.</p>
                        </div>
                    )}
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={() => {
                    // Navigate home for search, as this page doesn't have the search overlay
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default WatchlistPage;
