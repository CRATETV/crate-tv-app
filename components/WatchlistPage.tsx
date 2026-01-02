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
    const { user, watchlist, toggleWatchlist, likedMovies, toggleLikeMovie, watchedMovies } = useAuth();
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

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleGoHome = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showNavLinks={true}
            />
            <main className="flex-grow pt-32 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <button onClick={handleGoHome} className="mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-[0.3em]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Home
                    </button>

                    <h1 className="text-4xl md:text-7xl font-black text-white mb-12 tracking-tighter uppercase">My List</h1>
                    {watchlistMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 animate-[fadeIn_0.5s_ease-out]">
                            {watchlistMovies.map(movie => (
                                <MovieCard 
                                    key={movie.key} 
                                    movie={movie} 
                                    onSelectMovie={handleSelectMovie} 
                                    isOnWatchlist={true}
                                    onToggleWatchlist={toggleWatchlist}
                                    isLiked={likedMovies.includes(movie.key)}
                                    onToggleLike={toggleLikeMovie}
                                    isWatched={watchedMovies.includes(movie.key)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem]">
                            <h2 className="text-2xl font-black text-gray-700 uppercase tracking-widest">Your List is Empty</h2>
                            <p className="text-gray-500 mt-2 font-medium">Use the (+) icon on any film to save it for later.</p>
                            <button onClick={handleGoHome} className="mt-8 bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest">Start Exploring</button>
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

export default WatchlistPage;