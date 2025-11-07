import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import SearchOverlay from './components/SearchOverlay';
// FIX: Corrected import path
import { Movie, Actor, Category } from './types';
import { useAuth } from './contexts/AuthContext';
import { useFestival } from './contexts/FestivalContext';
import FestivalHero from './components/FestivalHero';
import NowPlayingBanner from './components/NowPlayingBanner';
import BackToTopButton from './components/BackToTopButton';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';

const App: React.FC = () => {
    // Hooks
    const { user, likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig } = useFestival();
    
    // State
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    
    // Memos for performance
    const heroMovies = useMemo(() => {
        const featuredCategory = categories.featured;
        if (!featuredCategory?.movieKeys) return [];
        return featuredCategory.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, categories.featured]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase();
        return (Object.values(movies) as Movie[]).filter(movie =>
            movie && (
                (movie.title || '').toLowerCase().includes(query) ||
                (movie.director || '').toLowerCase().includes(query) ||
                (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(query))
            )
        );
    }, [searchQuery, movies]);
    
    // Watched/Liked/Watchlist sets for quick lookups
    const likedMovies = useMemo(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    // Handlers
    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    const handlePlayMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSelectFromSearch = (movie: Movie) => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
        handleSelectMovie(movie);
    };

    const handleSearchSubmit = (query: string) => {
        if (searchResults.length > 0) {
            handleSelectMovie(searchResults[0]);
        }
    };

    const handleSupportMovie = (movie: Movie) => {
        setDetailsMovie(movie);
        // A real implementation would likely open a specific tab or view in the modal
    };
    
    // Effects
    useEffect(() => {
        if (heroMovies.length > 1) {
            const interval = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 7000);
            return () => clearInterval(interval);
        }
    }, [heroMovies.length]);

     if (isLoading) {
        return <LoadingSpinner />;
    }

    const nowPlayingMovie = movies['consumed'];

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onSearchSubmit={handleSearchSubmit}
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
            />
            <main className="flex-grow pb-24 md:pb-0">
                {isFestivalLive ? (
                    <FestivalHero festivalConfig={festivalConfig} />
                ) : (
                    heroMovies.length > 0 && (
                        <Hero 
                            movies={heroMovies} 
                            currentIndex={heroIndex} 
                            onSetCurrentIndex={setHeroIndex} 
                            onPlayMovie={handlePlayMovie}
                            onMoreInfo={handleSelectMovie}
                        />
                    )
                )}
                
                <div className="px-4 md:px-12 -mt-8 md:-mt-20 relative z-10 space-y-8 md:space-y-12">
                    {nowPlayingMovie && <NowPlayingBanner movie={nowPlayingMovie} onSelectMovie={handleSelectMovie} onPlayMovie={handlePlayMovie} />}

                    {// FIX: Explicitly type `category` as `Category` to resolve properties on the 'unknown' type.
                    Object.entries(categories).map(([key, category]: [string, Category]) => {
                        const categoryMovies = category.movieKeys
                            .map(movieKey => movies[movieKey])
                            .filter((m): m is Movie => !!m);
                        
                        if (categoryMovies.length === 0 || key === 'featured' || key === 'publicDomainIndie') return null;

                        return (
                            <MovieCarousel
                                key={key}
                                title={category.title}
                                movies={categoryMovies}
                                onSelectMovie={handlePlayMovie}
                                watchedMovies={watchedMovies}
                                watchlist={watchlist}
                                likedMovies={likedMovies}
                                onToggleLike={toggleLikeMovie}
                                onSupportMovie={handleSupportMovie}
                            />
                        );
                    })}
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />

            {/* Modals and Overlays */}
            {detailsMovie && (
                <MovieDetailsModal 
                    movie={detailsMovie} 
                    isLiked={likedMovies.has(detailsMovie.key)}
                    onToggleLike={toggleLikeMovie}
                    onClose={() => setDetailsMovie(null)} 
                    onSelectActor={setSelectedActor}
                    allMovies={movies}
                    allCategories={categories}
                    onSelectRecommendedMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    onSupportMovie={handleSupportMovie}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
            {isMobileSearchOpen && (
                <SearchOverlay 
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onClose={() => setIsMobileSearchOpen(false)}
                  onSubmit={handleSearchSubmit}
                  results={searchResults}
                  onSelectMovie={handleSelectFromSearch}
                />
            )}
        </div>
    );
};

export default App;
