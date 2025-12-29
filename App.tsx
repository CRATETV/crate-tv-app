import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import SearchOverlay from './components/SearchOverlay';
import { Movie, Actor, Category, SiteSettings } from './types';
import { isMovieReleased, categoriesData } from './constants';
import { useAuth } from './contexts/AuthContext';
import { useFestival } from './contexts/FestivalContext';
import FestivalHero from './components/FestivalHero';
import BackToTopButton from './components/BackToTopButton';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import SquarePaymentModal from './components/SquarePaymentModal';
import FestivalLiveModal from './components/FestivalLiveModal';
import LiveWatchPartyBanner from './components/LiveWatchPartyBanner';
import NowStreamingBanner from './components/NowPlayingBanner';
import NewFilmAnnouncementModal from './components/NewFilmAnnouncementModal';

const HolidaySpecialTitle: React.FC<{ settings: SiteSettings }> = ({ settings }) => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.history.pushState({}, '', '/cratemas');
        window.dispatchEvent(new Event('pushstate'));
    };

    const name = settings.holidayName || 'Cratemas';
    const theme = settings.holidayTheme || 'christmas';

    const themes = {
        christmas: {
            gradient: 'from-[#ff0000] via-white to-[#22c55e]',
            glow: 'rgba(255,0,0,0.4)',
            hoverGlow: 'rgba(255,0,0,0.9)',
            particleColor: '#ff0000'
        },
        valentines: {
            gradient: 'from-[#f43f5e] via-white to-[#be123c]',
            glow: 'rgba(244,63,94,0.4)',
            hoverGlow: 'rgba(190,18,60,0.9)',
            particleColor: '#f43f5e'
        },
        gold: {
            gradient: 'from-[#fbbf24] via-[#fef3c7] to-[#d97706]',
            glow: 'rgba(251,191,36,0.4)',
            hoverGlow: 'rgba(217,119,6,0.9)',
            particleColor: '#fbbf24'
        },
        generic: {
            gradient: 'from-white via-gray-300 to-gray-500',
            glow: 'rgba(255,255,255,0.2)',
            hoverGlow: 'rgba(255,255,255,0.4)',
            particleColor: '#ffffff'
        }
    };

    const currentTheme = themes[theme] || themes.christmas;

    return (
        <div 
            className="flex flex-col mb-10 px-2 select-none cursor-pointer group/title transition-all duration-500"
            onClick={handleNavigate}
        >
            <div className="relative inline-block self-start">
                <div className="flex items-baseline gap-6">
                    <h2 className={`text-5xl md:text-8xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-br ${currentTheme.gradient} relative z-10 py-2 transition-all duration-700 drop-shadow-[0_0_20px_${currentTheme.glow}] group-hover/title:drop-shadow-[0_0_55px_${currentTheme.hoverGlow}] group-hover/title:scale-[1.05]`}>
                        {name}
                    </h2>
                </div>
                <div className={`absolute bottom-0 left-0 w-0 h-[4px] bg-gradient-to-r ${currentTheme.gradient} group-hover/title:w-full transition-all duration-700 ease-in-out opacity-90 shadow-[0_0_25px_rgba(255,255,255,0.4)]`}></div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const { likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, dataSource, settings } = useFestival();
    
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [supportMovieModal, setSupportMovieModal] = useState<Movie | null>(null);
    const [showFestivalModal, setShowFestivalModal] = useState(false);
    const [showNowStreamingModal, setShowNowStreamingModal] = useState(false);
    const [liveWatchParty, setLiveWatchParty] = useState<Movie | null>(null);
    
    const heroMovies = useMemo(() => {
        const featuredCategory = categories.featured;
        let spotlightMovies: Movie[] = [];
        if (featuredCategory?.movieKeys && featuredCategory.movieKeys.length > 0) {
            spotlightMovies = featuredCategory.movieKeys
                .map((key: string) => movies[key])
                .filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m));
        }
        if (spotlightMovies.length === 0) {
            spotlightMovies = (Object.values(movies) as Movie[])
                .filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m) && !!m.title && !!m.poster)
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 4);
        }
        return spotlightMovies;
    }, [movies, categories.featured]);

    const nowStreamingMovie = useMemo(() => {
        const keys = categories.nowStreaming?.movieKeys || [];
        if (keys.length === 0) return null;
        return movies[keys[0]] || null;
    }, [movies, categories.nowStreaming]);

    const topTenMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((movie: Movie | undefined): movie is Movie => !!movie && !!movie.title)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase().trim();
        return (Object.values(movies) as Movie[]).filter((movie: Movie | undefined) =>
            movie && (
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
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
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

    return (
        <div className="flex flex-col min-h-screen text-white overflow-x-hidden w-full relative">
            {liveWatchParty && <LiveWatchPartyBanner movie={liveWatchParty} onClose={() => setLiveWatchParty(null)} />}
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={handleSearchClick}
                topOffset={liveWatchParty ? '3rem' : '0px'}
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
                                onSupportMovie={setSupportMovieModal}
                            />
                        ) : (
                          <>
                            {nowStreamingMovie && !settings.isHolidayModeActive && (
                                <NowStreamingBanner 
                                    movie={nowStreamingMovie} 
                                    onSelectMovie={handleSelectMovie} 
                                    onPlayMovie={handlePlayMovie} 
                                />
                            )}
                            {Object.entries(categories).map(([key, category]) => {
                                const typedCategory = category as Category;
                                if (key === 'featured' || key === 'nowStreaming' || key === 'publicDomainIndie') return null;
                                const categoryMovies = typedCategory.movieKeys
                                    .map(movieKey => movies[movieKey])
                                    .filter((m: Movie | undefined): m is Movie => !!m);
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
                                        onSupportMovie={setSupportMovieModal}
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
                    onSupportMovie={setSupportMovieModal}
                />
            )}
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