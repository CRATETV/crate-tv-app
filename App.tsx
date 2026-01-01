import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import SearchOverlay from './components/SearchOverlay';
import SmartInstallPrompt from './components/SmartInstallPrompt';
import SEO from './components/SEO';
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
import CrateFestBanner from './components/CrateFestBanner';

const FestivalActiveBanner: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 flex items-center justify-center gap-4 shadow-lg h-12">
        <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-black uppercase text-[10px] tracking-widest">Festival Active</span>
        </div>
        <p className="text-xs font-bold hidden sm:block">Explore the Official Selections in the Festival Portal</p>
        <button 
            onClick={() => {
                window.history.pushState({}, '', '/festival');
                window.dispatchEvent(new Event('pushstate'));
            }}
            className="bg-white text-indigo-600 font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
        >
            Enter Portal
        </button>
        <button onClick={onClose} className="text-white/50 hover:text-white">&times;</button>
    </div>
);

const App: React.FC = () => {
    const { hasCrateFestPass, likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, settings } = useFestival();
    
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [activeParties, setActiveParties] = useState<Record<string, WatchPartyState>>({});
    const [isFestivalBannerDismissed, setIsFestivalBannerDismissed] = useState(false);
    
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

    const isCrateFestLive = useMemo(() => {
        const config = settings.crateFestConfig;
        if (!config?.isActive || !config?.startDate || !config?.endDate) return false;
        const now = new Date();
        return now >= new Date(config.startDate) && now <= new Date(config.endDate);
    }, [settings.crateFestConfig]);

    const crateFestMovies = useMemo(() => {
        const config = settings.crateFestConfig;
        if (!config) return [];
        const keys = config.movieBlocks.flatMap((b: any) => b.movieKeys);
        return keys.map((k: string) => movies[k]).filter((m: Movie | undefined): m is Movie => !!m);
    }, [movies, settings.crateFestConfig]);

    const comingSoonMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((m: Movie) => !!m && !isMovieReleased(m) && !m.isUnlisted)
            .sort((a, b) => new Date(a.releaseDateTime || 0).getTime() - new Date(b.releaseDateTime || 0).getTime());
    }, [movies]);

    const livePartyMovie = useMemo(() => {
        const liveKey = Object.keys(activeParties).find(key => {
            const m = movies[key];
            return m && m.isWatchPartyEnabled && !m.isUnlisted;
        });
        return liveKey ? movies[liveKey] : null;
    }, [activeParties, movies]);

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

    const showWatchParty = !!livePartyMovie;
    const showFestival = isFestivalLive && !isFestivalBannerDismissed;
    
    let headerTop = '0px';
    const isAnyBannerVisible = isCrateFestLive || showWatchParty || showFestival;
    
    if (isCrateFestLive) headerTop = '3rem';
    else if (showWatchParty && showFestival) headerTop = '6rem';
    else if (showWatchParty || showFestival) headerTop = '3rem';

    return (
        <div className="flex flex-col min-h-screen text-white overflow-x-hidden w-full relative">
            <SEO 
                title="Home"
                description="Stream the best independent short films, features, and documentaries. Crate TV is the home of the unseen, curated by artists for visionaries."
            />
            <SmartInstallPrompt />
            
            {isCrateFestLive && settings.crateFestConfig && (
                <CrateFestBanner config={settings.crateFestConfig} hasPass={hasCrateFestPass} />
            )}

            {showWatchParty && !isCrateFestLive && (
                <LiveWatchPartyBanner 
                    movie={livePartyMovie!} 
                    onClose={() => setActiveParties(prev => {
                        const next = { ...prev };
                        delete next[livePartyMovie!.key];
                        return next;
                    })} 
                />
            )}

            {showFestival && !isCrateFestLive && (
                <div style={{ top: showWatchParty ? '3rem' : '0px' }} className="fixed left-0 right-0 z-50">
                    <FestivalActiveBanner onClose={() => setIsFestivalBannerDismissed(true)} />
                </div>
            )}

            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={handleSearchClick}
                topOffset={headerTop}
                isLiveSpotlight={isNowStreamingLive}
            />

            <main 
                className={`flex-grow pb-24 md:pb-0 overflow-x-hidden transition-all duration-500`}
                style={{ paddingTop: isAnyBannerVisible ? '3rem' : '0px' }}
            >
                {isFestivalLive && !isCrateFestLive ? (
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
                            {crateFestMovies.length > 0 && (
                                <MovieCarousel
                                    key="crate-fest"
                                    title={
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-red-600">{settings.crateFestConfig?.title}</span>
                                            <button onClick={() => window.location.href='/cratefest'} className="bg-white text-black px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Enter Collection</button>
                                        </div>
                                    }
                                    movies={crateFestMovies}
                                    onSelectMovie={(m) => window.location.href='/cratefest'}
                                    watchedMovies={watchedMovies}
                                    watchlist={watchlist}
                                    likedMovies={likedMovies}
                                    onToggleLike={toggleLikeMovie}
                                    onToggleWatchlist={toggleWatchlist}
                                    onSupportMovie={() => {}}
                                />
                            )}

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