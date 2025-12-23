
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import SearchOverlay from './components/SearchOverlay';
import { Movie, Actor, Category } from './types';
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
import WatchPartyAnnouncementModal from './components/WatchPartyAnnouncementModal';
import NewFilmAnnouncementModal from './components/NewFilmAnnouncementModal';

// High-Aesthetic Minimal Cratemas Header - Pumped up Red Luminosity
const CratemasTitle: React.FC = () => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.history.pushState({}, '', '/cratemas');
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div 
            className="flex flex-col mb-10 px-2 select-none cursor-pointer group/title transition-all duration-500"
            onClick={handleNavigate}
        >
            <div className="relative inline-block self-start">
                {/* Minimal twinkles - Ice Crystals - Brighter */}
                <div className="absolute -inset-8 pointer-events-none z-20">
                    <div className="absolute top-0 left-4 w-2 h-2 bg-white rounded-full animate-[holiday-twinkle_3s_infinite] opacity-0 shadow-[0_0_15px_#fff]"></div>
                    <div className="absolute top-12 right-0 w-1.5 h-1.5 bg-white rounded-full animate-[holiday-twinkle_4s_infinite_1s] opacity-0 shadow-[0_0_15px_#fff]"></div>
                    <div className="absolute -bottom-6 left-1/2 w-1.5 h-1.5 bg-white rounded-full animate-[holiday-twinkle_5s_infinite_0.5s] opacity-0 shadow-[0_0_15px_#fff]"></div>
                    <div className="absolute top-6 left-1/4 w-1.5 h-1.5 bg-[#ff0000] rounded-full animate-[holiday-twinkle_2.5s_infinite_1.2s] opacity-0 shadow-[0_0_15px_#ff0000]"></div>
                </div>

                <div className="flex items-baseline gap-6">
                    <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-[#ff0000] via-white to-[#22c55e] relative z-10 py-2 transition-all duration-700 drop-shadow-[0_0_20px_rgba(255,0,0,0.4)] group-hover/title:drop-shadow-[0_0_55px_rgba(255,0,0,0.9)] group-hover/title:scale-[1.05]">
                        Cratemas
                    </h2>
                    
                    <div className="flex items-center gap-2 opacity-0 -translate-x-4 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-500 ease-out">
                        <span className="h-[2px] w-16 bg-gradient-to-r from-transparent to-white"></span>
                        <span className="text-[12px] text-white font-black uppercase tracking-[0.5em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">The Collection</span>
                    </div>
                </div>

                {/* Elegant high-intensity neon underline */}
                <div className="absolute bottom-0 left-0 w-0 h-[4px] bg-gradient-to-r from-[#ff0000] via-white to-[#22c55e] group-hover/title:w-full transition-all duration-700 ease-in-out opacity-90 shadow-[0_0_25px_rgba(255,0,0,0.8)]"></div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // Hooks
    const { user, likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, dataSource, settings } = useFestival();
    
    // State
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
    const [supportMovieModal, setSupportMovieModal] = useState<Movie | null>(null);
    const [showFestivalModal, setShowFestivalModal] = useState(false);
    const [liveWatchParty, setLiveWatchParty] = useState<Movie | null>(null);
    const [announcementMovieModal, setAnnouncementMovieModal] = useState<Movie | null>(null);
    const [newFilmAnnouncement, setNewFilmAnnouncement] = useState<Movie | null>(null);
    const [shouldAutoFocusSearch, setShouldAutoFocusSearch] = useState(false);
    
    // Memos for performance
    const heroMovies = useMemo(() => {
        const featuredCategory = categories.featured;
        let spotlightMovies: Movie[] = [];
        if (featuredCategory?.movieKeys && featuredCategory.movieKeys.length > 0) {
            spotlightMovies = featuredCategory.movieKeys
                .map((key: string) => movies[key])
                .filter((m): m is Movie => !!m && isMovieReleased(m));
        }
        if (spotlightMovies.length === 0) {
            spotlightMovies = (Object.values(movies) as Movie[])
                .filter(m => m && isMovieReleased(m) && !!m.title)
                .sort((a, b) => {
                    const dateA = a.releaseDateTime ? new Date(a.releaseDateTime).getTime() : 0;
                    const dateB = b.releaseDateTime ? new Date(b.releaseDateTime).getTime() : 0;
                    return dateB - dateA;
                })
                .slice(0, 4);
        }
        return spotlightMovies;
    }, [movies, categories.featured]);

    const topTenMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((movie): movie is Movie => !!movie && !!movie.title)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

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
    
    const likedMovies = useMemo<Set<string>>(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo<Set<string>>(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo<Set<string>>(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    const watchlistMovies = useMemo(() => {
        return (watchlistArray || [])
            .map((key: string) => movies[key])
            .filter((m): m is Movie => !!m)
            .reverse();
    }, [movies, watchlistArray]);


    // Handlers
    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    const handlePlayMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };
    const handleSelectFromSearch = (movie: Movie) => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
        handlePlayMovie(movie);
    };
    const handleSupportMovie = (movie: Movie) => setSupportMovieModal(movie);
    const handleCloseFestivalModal = () => {
        sessionStorage.setItem('festivalModalSeen', 'true');
        setShowFestivalModal(false);
    };
    const handleNavigateToFestival = () => {
        handleCloseFestivalModal();
        window.history.pushState({}, '', '/festival');
        window.dispatchEvent(new Event('pushstate'));
    }
    const handleDismissPartyBanner = () => {
        if (liveWatchParty) {
            sessionStorage.setItem('livePartyBannerDismissed', liveWatchParty.key);
        }
        setLiveWatchParty(null);
    }
    
    useEffect(() => {
        if (heroMovies.length > 1) {
            const interval = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 8000);
            return () => clearInterval(interval);
        }
    }, [heroMovies.length]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const searchParam = params.get('search');
        if (searchParam) {
            setSearchQuery(searchParam);
            setShouldAutoFocusSearch(true);
        }
        const actionParam = params.get('action');
        if (actionParam === 'search') setIsMobileSearchOpen(true);
        if (searchParam || actionParam) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (isLoading || !dataSource) return;
        if (isFestivalLive && !sessionStorage.getItem('festivalModalSeen')) {
            setShowFestivalModal(true);
        }
        const fourHours = 4 * 60 * 60 * 1000;
        const now = Date.now();
        const activeParty = (Object.values(movies) as Movie[]).find(m => {
            if (!m || !m.isWatchPartyEnabled || !m.watchPartyStartTime) return false;
            const startTime = new Date(m.watchPartyStartTime).getTime();
            return now >= startTime && (now - startTime < fourHours);
        });
        if (activeParty && sessionStorage.getItem('livePartyBannerDismissed') !== activeParty.key) {
            setLiveWatchParty(activeParty);
        } else {
            setLiveWatchParty(null);
        }
        
        const nowStreamingKey = categories.nowStreaming?.movieKeys[0];
        const newFilm = nowStreamingKey ? movies[nowStreamingKey] : null;
        if (newFilm && isMovieReleased(newFilm) && !sessionStorage.getItem('newFilmModalSeen')) {
            setNewFilmAnnouncement(newFilm);
        }
    }, [isLoading, isFestivalLive, dataSource, movies, categories.nowStreaming]);
    
    useEffect(() => {
        if (likedMovies.size === 0 || Object.keys(movies).length === 0) {
            setRecommendedMovies([]);
            return;
        }
        const fetchRecommendations = async () => {
            try {
                const likedTitles = Array.from(likedMovies).map(key => movies[key]?.title).filter(Boolean);
                const response = await fetch('/api/generate-recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ likedTitles, allMovies: movies }),
                });
                if (!response.ok) return;
                const data = await response.json();
                const recommendedKeys: string[] = data.recommendedKeys || [];
                const recMovies = recommendedKeys
                    .map(key => movies[key])
                    .filter((m): m is Movie => !!m && !likedMovies.has(m.key) && isMovieReleased(m));
                setRecommendedMovies(recMovies);
            } catch (error) {
                console.error("Failed to fetch AI recommendations:", error);
            }
        };
        fetchRecommendations();
    }, [likedMovies, movies]);

    if (isLoading) return <LoadingSpinner />;

    const bannerHeight = liveWatchParty ? '3rem' : '0px';

    // Advanced flexibility: Find Cratemas by key OR by title (case-insensitive)
    const cratemasCategory = useMemo(() => {
        if (categories.cratemas) return categories.cratemas;
        const found = (Object.values(categories) as Category[]).find(c => c.title && c.title.toLowerCase() === 'cratemas');
        return found || categoriesData.cratemas;
    }, [categories]);

    return (
        <div className="flex flex-col min-h-screen text-white">
            {liveWatchParty && <LiveWatchPartyBanner movie={liveWatchParty} onClose={handleDismissPartyBanner} />}
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                topOffset={bannerHeight}
                autoFocus={shouldAutoFocusSearch}
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
                
                <div className="px-4 md:px-12 relative z-10">
                    {/* Fixed Spacing: Substantial margin to clear Hero visual and text */}
                    <div className="mt-16 md:mt-24 lg:mt-32 space-y-12 md:space-y-16">
                        
                        {searchQuery ? (
                            searchResults.length > 0 ? (
                                <MovieCarousel
                                    key="search-results"
                                    title={`Search Results for "${searchQuery}"`}
                                    movies={searchResults}
                                    onSelectMovie={handlePlayMovie}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={handleSupportMovie}
                                />
                            ) : (
                                <div className="text-center text-gray-400 py-8">
                                    <p>No results found for "{searchQuery}"</p>
                                </div>
                            )
                        ) : (
                          <>
                            {/* EVERGREEN CRATEMAS ROW - Auto-hides if empty or disabled by master switch */}
                            {settings.isHolidayModeActive && cratemasCategory && cratemasCategory.movieKeys && cratemasCategory.movieKeys.length > 0 && (
                                <MovieCarousel
                                    key="cratemas"
                                    title={<CratemasTitle />}
                                    movies={cratemasCategory.movieKeys.map(k => movies[k]).filter((m): m is Movie => !!m)}
                                    onSelectMovie={handlePlayMovie}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={handleSupportMovie}
                                />
                            )}
                            
                            {topTenMovies.length > 0 && (
                                <MovieCarousel
                                    key="top-ten"
                                    title="Top 10 on Crate TV Today"
                                    movies={topTenMovies}
                                    onSelectMovie={handlePlayMovie}
                                    showRankings={true}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={handleSupportMovie}
                                    allCategories={categories}
                                />
                            )}

                            {watchlistMovies.length > 0 && (
                                <MovieCarousel
                                    key="watchlist"
                                    title="My List"
                                    movies={watchlistMovies}
                                    onSelectMovie={handlePlayMovie}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={handleSupportMovie}
                                />
                            )}

                            {recommendedMovies.length > 0 && (
                                <MovieCarousel
                                    key="recommendations"
                                    title="Recommended for You"
                                    movies={recommendedMovies}
                                    onSelectMovie={handlePlayMovie}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={handleSupportMovie}
                                />
                            )}

                            {Object.entries(categories).map(([key, category]) => {
                                const typedCategory = category as Category;
                                const categoryMovies = typedCategory.movieKeys
                                    .map(movieKey => movies[movieKey])
                                    .filter((m: Movie | undefined): m is Movie => !!m);
                                
                                // Skip categories already handled or system categories
                                if (categoryMovies.length === 0 || key === 'featured' || key === 'publicDomainIndie' || key === 'nowStreaming' || key === 'cratemas' || (typedCategory?.title && typedCategory.title.toLowerCase() === 'cratemas')) return null;

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
                                        onSupportMovie={handleSupportMovie}
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
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />

            {/* Modals */}
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
                  results={searchResults}
                  onSelectMovie={handleSelectFromSearch}
                />
            )}
            {supportMovieModal && (
                <SquarePaymentModal
                    movie={supportMovieModal}
                    paymentType="donation"
                    onClose={() => setSupportMovieModal(null)}
                    onPaymentSuccess={() => setSupportMovieModal(null)}
                />
            )}
            {showFestivalModal && <FestivalLiveModal onClose={handleCloseFestivalModal} onNavigate={handleNavigateToFestival} />}
            {announcementMovieModal && (
                <WatchPartyAnnouncementModal 
                    movie={announcementMovieModal}
                    onClose={() => {
                        sessionStorage.setItem('livePartyAnnouncementDismissed', announcementMovieModal.key);
                        setAnnouncementMovieModal(null);
                    }}
                    onJoin={() => {
                        setAnnouncementMovieModal(null);
                        window.history.pushState({}, '', `/watchparty/${announcementMovieModal.key}`);
                        window.dispatchEvent(new Event('pushstate'));
                    }}
                />
            )}
            {newFilmAnnouncement && (
                <NewFilmAnnouncementModal
                    movie={newFilmAnnouncement}
                    onClose={() => {
                        sessionStorage.setItem('newFilmModalSeen', 'true');
                        setNewFilmAnnouncement(null);
                    }}
                    onWatchNow={() => {
                        sessionStorage.setItem('newFilmModalSeen', 'true');
                        setNewFilmAnnouncement(null);
                        handlePlayMovie(newFilmAnnouncement);
                    }}
                />
            )}
        </div>
    );
};

export default App;
