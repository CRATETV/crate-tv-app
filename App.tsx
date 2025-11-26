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
import { isMovieReleased } from './constants';
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

const App: React.FC = () => {
    // Hooks
    const { user, likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
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
    
    // Memos for performance
    const heroMovies = useMemo(() => {
        const featuredCategory = categories.featured;
        if (!featuredCategory?.movieKeys) return [];
        return featuredCategory.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m && isMovieReleased(m));
    }, [movies, categories.featured]);

    const topTenMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((movie): movie is Movie => !!movie && !!movie.title) // Ensure movie is valid
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);
    
    const comingSoonMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((m): m is Movie => !!m && !!m.releaseDateTime && !isMovieReleased(m))
            .sort((a, b) => new Date(a.releaseDateTime!).getTime() - new Date(b.releaseDateTime!).getTime());
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
    
    // Watched/Liked/Watchlist sets for quick lookups
    const likedMovies = useMemo(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    const watchlistMovies = useMemo(() => {
        return (watchlistArray || [])
            .map(key => movies[key])
            .filter((m): m is Movie => !!m)
            .reverse(); // Show most recently added first
    }, [movies, watchlistArray]);


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

    const handleSupportMovie = (movie: Movie) => {
        setSupportMovieModal(movie);
    };

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
    
    // Effects
    useEffect(() => {
        if (heroMovies.length > 1) {
            const interval = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 7000);
            return () => clearInterval(interval);
        }
    }, [heroMovies.length]);

    // Effect for localStorage events from other tabs (e.g., admin panel)
    useEffect(() => {
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'crate-tv-event' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data.type === 'FESTIVAL_LIVE') {
                        // Don't show if already seen in this session
                        if (!sessionStorage.getItem('festivalModalSeen')) {
                            setShowFestivalModal(true);
                        }
                    } else if (data.type === 'WATCH_PARTY_LIVE' && data.movieKey) {
                        const movie = movies[data.movieKey];
                        if (movie) {
                            // Don't show if already dismissed in this session
                            if (sessionStorage.getItem('livePartyAnnouncementDismissed') !== movie.key) {
                                setAnnouncementMovieModal(movie);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error parsing storage event", e);
                }
            }
        };

        window.addEventListener('storage', handleStorageEvent);

        return () => {
            window.removeEventListener('storage', handleStorageEvent);
        };
    }, [movies]);


    // Effect for live event notifications on page load
    useEffect(() => {
        if (isLoading || !dataSource) return;

        // Festival Check
        if (isFestivalLive && !sessionStorage.getItem('festivalModalSeen')) {
            setShowFestivalModal(true);
        }

        // Watch Party Check for banner
        const fourHours = 4 * 60 * 60 * 1000;
        const now = Date.now();
        // FIX: Explicitly cast Object.values(movies) to Movie[] to resolve 'unknown' type error on `m`.
        const activeParty = (Object.values(movies) as Movie[]).find(m => {
            if (!m || !m.isWatchPartyEnabled || !m.watchPartyStartTime) return false;
            const startTime = new Date(m.watchPartyStartTime).getTime();
            // A party is "active" if it started and is less than 4 hours old
            return now >= startTime && (now - startTime < fourHours);
        });

        if (activeParty && sessionStorage.getItem('livePartyBannerDismissed') !== activeParty.key) {
            setLiveWatchParty(activeParty);
        } else {
            setLiveWatchParty(null);
        }

        // New Film Announcement Check
        const newFilmKey = nowStreamingKey; // Use the configurable now streaming movie
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

    // --- INJECT AD SCRIPT (BOTTOM PLACEMENT) ---
    useEffect(() => {
        const adScript = localStorage.getItem('productionAdScript');
        if (adScript) {
            try {
                const containerId = 'cratetv-ad-container';
                let container = document.getElementById(containerId);

                if (!container) {
                    container = document.createElement('div');
                    container.id = containerId;
                    // Force ads to the bottom. 
                    // On mobile, we lift it up slightly to avoid covering the navigation bar.
                    container.style.cssText = `
                        position: fixed;
                        left: 0;
                        right: 0;
                        bottom: 0; 
                        width: 100%;
                        z-index: 9999;
                        pointer-events: none; 
                        display: flex;
                        justify-content: center;
                        align-items: flex-end;
                    `;
                    
                    // Allow clicks inside the container (on the ad itself)
                    container.style.pointerEvents = 'none'; 
                    
                    // Responsive positioning logic handled via CSS media query equivalent in JS
                    // We check window width to determine if we are on mobile
                    const updatePosition = () => {
                        if (window.innerWidth < 768) {
                            container!.style.bottom = '80px'; // Above mobile nav
                        } else {
                            container!.style.bottom = '0px'; // Bottom of screen on desktop
                        }
                    };
                    
                    window.addEventListener('resize', updatePosition);
                    updatePosition(); // Initial call

                    document.body.appendChild(container);
                } else {
                    // If container exists, clear it to prevent duplicates if re-renders happen strangely
                    container.innerHTML = '';
                }

                // Improved regex to be more permissive with spaces
                const srcMatch = adScript.match(/src\s*=\s*['"](.*?)['"]/);
                
                if (srcMatch && srcMatch[1]) {
                    const script = document.createElement('script');
                    script.src = srcMatch[1];
                    script.type = 'text/javascript';
                    script.async = true;
                    
                    // Append script to our custom bottom container
                    container.appendChild(script);
                    
                    // The ad itself needs pointer events to be clickable
                    // We rely on the script to generate elements that accept clicks.
                    // The container wrapper has pointer-events: none to let clicks pass through empty space.
                    // However, usually ad scripts inject *their own* div. 
                    // This wrapper method attempts to "trap" it or provide a specific mounting point context.
                } 
            } catch (e) {
                console.error("Failed to inject ad script", e);
            }
        }
    }, []);


     if (isLoading) {
        return <LoadingSpinner />;
    }

    const bannerHeight = liveWatchParty ? '3rem' : '0px';

    return (
        <div className="flex flex-col min-h-screen text-white">
            {liveWatchParty && <LiveWatchPartyBanner movie={liveWatchParty} onClose={handleDismissPartyBanner} />}
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                topOffset={bannerHeight}
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
                            {comingSoonMovies.length > 0 && (
                                <MovieCarousel
                                    key="coming-soon"
                                    title="Coming Soon"
                                    movies={comingSoonMovies}
                                    onSelectMovie={handleSelectMovie}
                                    isComingSoonCarousel={true}
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


                            {// FIX: Explicitly type `category` as `Category` to resolve properties on the 'unknown' type.
                            Object.entries(categories).map(([key, category]) => {
                                const typedCategory = category as Category;
                                const categoryMovies = typedCategory.movieKeys
                                    .map(movieKey => movies[movieKey])
                                    .filter((m): m is Movie => !!m);
                                
                                if (categoryMovies.length === 0 || key === 'featured' || key === 'publicDomainIndie' || key === 'nowStreaming') return null;

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
                    onPaymentSuccess={() => {
                        setSupportMovieModal(null);
                        // Optionally show a "thank you" toast/notification here
                    }}
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
