import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import SearchOverlay from './components/SearchOverlay';
import SmartInstallPrompt from './components/SmartInstallPrompt';
import { Movie, Actor, Category, WatchPartyState } from './types';
import { isMovieReleased } from './constants';
import { useAuth } from './contexts/AuthContext';
import { useFestival } from './contexts/FestivalContext';
import FestivalHero from './components/FestivalHero';
import BackToTopButton from './components/BackToTopButton';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import { getDbInstance } from './services/firebaseClient';
import LiveWatchPartyBanner from './components/LiveWatchPartyBanner';
import NowStreamingBanner from './components/NowPlayingBanner';

const App: React.FC = () => {
    const { likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, settings } = useFestival();
    
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [activeParties, setActiveParties] = useState<Record<string, WatchPartyState>>({});
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsubscribe = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => {
                const data = doc.data() as WatchPartyState;
                if (data.status === 'live') {
                    states[doc.id] = data;
                }
            });
            setActiveParties(states);
        });
        return () => unsubscribe();
    }, []);

    const heroMovies = useMemo(() => {
        const featuredCategory = categories.featured;
        let spotlightMovies: Movie[] = [];
        if (featuredCategory?.movieKeys && featuredCategory.movieKeys.length > 0) {
            spotlightMovies = featuredCategory.movieKeys
                .map((key: string) => movies[key])
                .filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m) && !m.isUnlisted);
        }
        if (spotlightMovies.length === 0) {
            spotlightMovies = (Object.values(movies) as Movie[])
                .filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m) && !!m.title && !!m.poster && !m.isUnlisted)
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 4);
        }
        return spotlightMovies;
    }, [movies, categories.featured]);

    const comingSoonMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m && !isMovieReleased(m) && !m.isUnlisted)
            .sort((a, b) => new Date(a.releaseDateTime || 0).getTime() - new Date(b.releaseDateTime || 0).getTime());
    }, [movies]);

    const nowStreamingMovie = useMemo(() => {
        const keys = categories.nowStreaming?.movieKeys || [];
        if (keys.length === 0) return null;
        const m = movies[keys[0]];
        return (m && isMovieReleased(m) && !m.isUnlisted) ? m : null;
    }, [movies, categories.nowStreaming]);

    const isNowStreamingLive = useMemo(() => {
        if (!nowStreamingMovie) return false;
        const partyState = activeParties[nowStreamingMovie.key];
        return !!partyState && nowStreamingMovie.isWatchPartyEnabled === true;
    }, [nowStreamingMovie, activeParties]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase().trim();
        return (Object.values(movies) as Movie[]).filter((movie: Movie | undefined) =>
            movie && movie.poster && movie.title && !movie.isUnlisted && isMovieReleased(movie) &&
            (
                (movie.title || '').toLowerCase().includes(query) ||
                (movie.director || '').toLowerCase().includes(query) ||
                (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(query))
            )
        );
    }, [searchQuery, movies]);
    
    const likedMovies = useMemo<Set<string>>(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo<Set<string>>(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo<Set<string>>(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    
    const handlePlayMovie = (movie: Movie) => {
        const path = (activeParties[movie.key] && movie.isWatchPartyEnabled)
            ? `/watchparty/${movie.key}` 
            : `/movie/${movie.key}?play=true`;
        
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSearchClick = () => {
        setSearchQuery('');
        setIsMobileSearchOpen(true);
    };

    useEffect(() => {
        if (heroMovies.length > 1) {
            const interval = setInterval(() => setHeroIndex(prev => (prev + 1) % heroMovies.length), 8000);
            return () => clearInterval(interval);
        }
    }, [heroMovies.length]);

    if (isLoading) return <LoadingSpinner />;

    const livePartyKey = Object.keys(activeParties).find(key => movies[key]?.isWatchPartyEnabled);
    const livePartyMovie = livePartyKey ? movies[livePartyKey] : null;

    return (
        <div className="flex flex-col min-h-screen text-white overflow-x-hidden w-full relative">
            <SmartInstallPrompt />
            {livePartyMovie && <LiveWatchPartyBanner movie={livePartyMovie} onClose={() => setActiveParties({})} />}
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={handleSearchClick}
                topOffset={livePartyMovie ? '3rem' : '0px'}
                isLiveSpotlight={isNowStreamingLive}
            />
            <main className="flex-grow pb-24 md:pb-0 overflow-x-hidden">
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
                
                <div className="px-4 md:px-12 relative z-10 w-full overflow-x-hidden">
                    <div className="mt-16 md:mt-24 lg:mt-32 space-y-12 md:space-y-16">
                        {searchQuery ? (
                            <MovieCarousel
                                key="search-results"
                                title={searchResults.length > 0 ? `Results for "${searchQuery}"` : `No results for "${searchQuery}"`}
                                movies={searchResults}
                                onSelectMovie={handlePlayMovie}
                                watchedMovies={watchedMovies}
                                watchlist={watchlist}
                                likedMovies={likedMovies}
                                onToggleLike={toggleLikeMovie}
                                onToggleWatchlist={toggleWatchlist}
                                onSupportMovie={() => {}}
                            />
                        ) : (
                          <>
                            {/* PRIORITY 1: COMING SOON - Always show first to build hype */}
                            {comingSoonMovies.length > 0 && (
                                <MovieCarousel
                                    key="coming-soon"
                                    title="Premiering Soon"
                                    movies={comingSoonMovies}
                                    onSelectMovie={handleSelectMovie}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={() => {}}
                                    isComingSoonCarousel={true}
                                />
                            )}

                            {nowStreamingMovie && !settings.isHolidayModeActive && (
                                <NowStreamingBanner 
                                    movie={nowStreamingMovie} 
                                    onSelectMovie={handleSelectMovie} 
                                    onPlayMovie={handlePlayMovie}
                                    isLive={isNowStreamingLive}
                                />
                            )}
                            
                            {Object.entries(categories).map(([key, category]) => {
                                const typedCategory = category as Category;
                                const titleLower = (typedCategory.title || '').toLowerCase();
                                
                                if (key === 'featured' || key === 'nowStreaming' || key === 'publicDomainIndie') return null;
                                if ((key === 'cratemas' || titleLower === 'cratemas') && !settings.isHolidayModeActive) return null;
                                
                                const categoryMovies = typedCategory.movieKeys
                                    .map(movieKey => movies[movieKey])
                                    .filter((m: Movie | undefined): m is Movie => !!m && !m.isUnlisted && isMovieReleased(m));
                                
                                if (categoryMovies.length === 0) return null;
                                return (
                                    <MovieCarousel
                                        key={key}
                                        title={typedCategory.title}
                                        movies={categoryMovies}
                                        onSelectMovie={handlePlayMovie}
                                        watchedMovies={watchedMovies}
                                        watchlist={watchlist}
                                        likedMovies={likedMovies}
                                        onToggleLike={toggleLikeMovie}
                                        onToggleWatchlist={toggleWatchlist}
                                        onSupportMovie={() => {}}
                                    />
                                );
                            })}
                          </>
                        )}
                    </div>
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleSearchClick} />

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
                    onSupportMovie={() => {}}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
            {isMobileSearchOpen && (
                <SearchOverlay 
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onClose={() => setIsMobileSearchOpen(false)}
                  results={searchResults}
                  onSelectMovie={(m) => { setIsMobileSearchOpen(false); handlePlayMovie(m); }}
                />
            )}
        </div>
    );
};

export default App;