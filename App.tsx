
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
import NowStreamingBanner from './components/NowPlayingBanner';
import BackToTopButton from './components/BackToTopButton';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import SquarePaymentModal from './components/SquarePaymentModal';
import FestivalLiveModal from './components/FestivalLiveModal';
import LiveWatchPartyBanner from './components/LiveWatchPartyBanner';
import WatchPartyAnnouncementModal from './components/WatchPartyAnnouncementModal';
import NewFilmAnnouncementModal from './components/NewFilmAnnouncementModal';

// Specialized Festive Component for Cratemas with Holiday Lights
const CratemasTitle: React.FC = () => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.history.pushState({}, '', '/cratemas');
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div 
            className="flex flex-col mb-10 px-2 select-none cursor-pointer group/title"
            onClick={handleNavigate}
        >
            <div className="relative inline-block self-start">
                {/* Weaving Holiday Lights SVG */}
                <svg 
                    className="absolute -top-8 -left-8 -right-12 h-28 w-[calc(100%+48px)] z-20 overflow-visible pointer-events-none" 
                    viewBox="0 0 350 100" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M 10 30 Q 50 5, 90 30 T 170 30 T 250 30 T 330 30 Q 345 50, 330 70 Q 250 95, 170 70 T 10 70" 
                        fill="none" 
                        stroke="#065f46" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                        className="opacity-90"
                    />
                    <circle cx="20" cy="22" r="4.5" fill="#ff4444" className="animate-[holiday-twinkle_1.2s_infinite_0.1s] drop-shadow-[0_0_12px_rgba(255,68,68,1)]" />
                    <circle cx="180" cy="30" r="4.5" fill="#ff4444" className="animate-[holiday-twinkle_1.2s_infinite_0.5s] drop-shadow-[0_0_12px_rgba(255,68,68,1)]" />
                    <circle cx="330" cy="50" r="4.5" fill="#ff4444" className="animate-[holiday-twinkle_1.2s_infinite_0.9s] drop-shadow-[0_0_12px_rgba(255,68,68,1)]" />
                    <circle cx="100" cy="85" r="4.5" fill="#ff4444" className="animate-[holiday-twinkle_1.2s_infinite_0.3s] drop-shadow-[0_0_12px_rgba(255,68,68,1)]" />
                    <circle cx="60" cy="12" r="4.5" fill="#22c55e" className="animate-[holiday-twinkle_1.5s_infinite_0.2s] drop-shadow-[0_0_12px_rgba(34,197,94,1)]" />
                    <circle cx="220" cy="22" r="4.5" fill="#22c55e" className="animate-[holiday-twinkle_1.5s_infinite_0.6s] drop-shadow-[0_0_12px_rgba(34,197,94,1)]" />
                    <circle cx="260" cy="82" r="4.5" fill="#22c55e" className="animate-[holiday-twinkle_1.5s_infinite_1s] drop-shadow-[0_0_12px_rgba(34,197,94,1)]" />
                    <circle cx="40" cy="78" r="4.5" fill="#22c55e" className="animate-[holiday-twinkle_1.5s_infinite_0.4s] drop-shadow-[0_0_12px_rgba(34,197,94,1)]" />
                    <circle cx="100" cy="25" r="4.5" fill="#3b82f6" className="animate-[holiday-twinkle_1.8s_infinite_0.3s] drop-shadow-[0_0_12px_rgba(59,130,246,1)]" />
                    <circle cx="280" cy="28" r="4.5" fill="#3b82f6" className="animate-[holiday-twinkle_1.8s_infinite_0.7s] drop-shadow-[0_0_12px_rgba(59,130,246,1)]" />
                    <circle cx="190" cy="88" r="4.5" fill="#3b82f6" className="animate-[holiday-twinkle_1.8s_infinite_1.1s] drop-shadow-[0_0_12px_rgba(59,130,246,1)]" />
                    <circle cx="140" cy="30" r="4.5" fill="#facc15" className="animate-[holiday-twinkle_2s_infinite_0s] drop-shadow-[0_0_12px_rgba(250,204,21,1)]" />
                    <circle cx="330" cy="75" r="4.5" fill="#facc15" className="animate-[holiday-twinkle_2s_infinite_0.4s] drop-shadow-[0_0_12px_rgba(250,204,21,1)]" />
                    <circle cx="50" cy="85" r="4.5" fill="#facc15" className="animate-[holiday-twinkle_2s_infinite_0.8s] drop-shadow-[0_0_12px_rgba(250,204,21,1)]" />
                </svg>

                <div className="flex items-center gap-4">
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-white to-green-600 relative z-10 py-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] group-hover/title:scale-105 transition-transform duration-300">
                        Cratemas
                    </h2>
                    <span className="text-white/40 text-sm font-black uppercase tracking-widest translate-y-4 opacity-0 group-hover/title:opacity-100 transition-opacity">View All &rarr;</span>
                </div>
                
                {/* Festive Bow */}
                <svg 
                    className="absolute -top-6 -right-12 w-20 h-20 z-30 drop-shadow-[0_6px_12px_rgba(0,0,0,0.7)] rotate-12 transition-transform group-hover/title:scale-110 group-hover/title:rotate-0 active:rotate-0" 
                    viewBox="0 0 100 100" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M50 50 Q30 20 10 40 Q0 50 10 60 Q30 80 50 50" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
                    <path d="M50 50 Q70 20 90 40 Q100 50 90 60 Q70 80 50 50" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
                    <circle cx="50" cy="50" r="8" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
                    <path d="M45 55 L35 90" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
                    <path d="M55 55 L65 90" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
                </svg>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // Hooks
    const { likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, dataSource } = useFestival();
    
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

    const nowStreamingKey = useMemo(() => categories.nowStreaming?.movieKeys[0], [categories.nowStreaming]);
    const nowStreamingMovie = useMemo(() => nowStreamingKey ? movies[nowStreamingKey] : null, [movies, nowStreamingKey]);

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
        const newFilmKey = nowStreamingKey;
        const newFilm = newFilmKey ? movies[newFilmKey] : null;
        if (newFilm && isMovieReleased(newFilm) && !sessionStorage.getItem('newFilmModalSeen')) {
            setNewFilmAnnouncement(newFilm);
        }
    }, [isLoading, isFestivalLive, dataSource, movies, nowStreamingKey]);
    
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
    const cratemasCategory = categories.cratemas || categoriesData.cratemas;

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
                    <div className={`${isFestivalLive ? 'mt-4 md:-mt-16' : 'mt-4 md:-mt-16'} space-y-8 md:space-y-12`}>
                        {nowStreamingMovie && isMovieReleased(nowStreamingMovie) && (
                            <NowStreamingBanner 
                                movie={nowStreamingMovie} 
                                onSelectMovie={handleSelectMovie} 
                                onPlayMovie={handlePlayMovie} 
                            />
                        )}
                        
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
                            {/* EXPLICIT CRATEMAS ROW - TOP PRIORITY */}
                            {cratemasCategory && (
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
                                
                                if (categoryMovies.length === 0 || key === 'featured' || key === 'publicDomainIndie' || key === 'nowStreaming' || key === 'cratemas') return null;

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
                  onSubmit={() => {}}
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
