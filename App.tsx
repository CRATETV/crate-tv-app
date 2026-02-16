
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
import { Movie, Actor, Category } from './types';
import { isMovieReleased } from './constants';
import { useAuth } from './contexts/AuthContext';
import { useFestival } from './contexts/FestivalContext';
import FestivalHero from './components/FestivalHero';
import BackToTopButton from './components/BackToTopButton';
import CollapsibleFooter from './components/CollapsibleFooter';
import BottomNavBar from './components/BottomNavBar';
import { getDbInstance } from './services/firebaseClient';
import LiveWatchPartyBanner from './components/LiveWatchPartyBanner';
import CrateFestBanner from './components/CrateFestBanner';
import CrateVaultRow from './components/CrateVaultRow';
import firebase from 'firebase/compat/app';

const MaintenanceScreen: React.FC = () => (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
        <div className="relative z-10 space-y-10 max-w-lg">
            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-40 mx-auto opacity-20" alt="Crate" />
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 px-4 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <p className="text-amber-500 font-black uppercase tracking-widest text-[9px]">Maintenance Protocol Active</p>
                </div>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Optimizing the Stream.</h2>
                <p className="text-gray-500 font-medium leading-relaxed">Our engineering core is currently performing scheduled infrastructure upgrades. We will be back online shortly.</p>
            </div>
            <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">Crate TV Infrastructure // V4.0</p>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    const { user, hasCrateFestPass, likedMovies: likedMoviesArray, toggleLikeMovie, watchlist: watchlistArray, toggleWatchlist, watchedMovies: watchedMoviesArray } = useAuth();
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, settings, analytics, activeParties, livePartyMovie, viewCounts } = useFestival();
    
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isFestivalBannerDismissed, setIsFestivalBannerDismissed] = useState(false);
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db || !user) return;

        const updatePresence = () => {
            db.collection('presence').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                currentPath: window.location.pathname
            }, { merge: true });
        };

        updatePresence();
        const interval = setInterval(updatePresence, 30000); 

        return () => {
            clearInterval(interval);
            db.collection('presence').doc(user.uid).delete().catch(() => {});
        };
    }, [user]);

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
                .sort((a: Movie, b: Movie) => (viewCounts?.[b.key] || 0) - (viewCounts?.[a.key] || 0))
                .slice(0, 4);
        }
        return spotlightMovies;
    }, [movies, categories.featured, viewCounts]);

    const vaultMovies = useMemo(() => {
        const vaultCategory = categories.vault;
        if (!vaultCategory?.movieKeys) return [];
        return vaultCategory.movieKeys
            .map((key: string) => movies[key])
            .filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m) && !m.isUnlisted)
            .sort((a: Movie, b: Movie) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }, [movies, categories.vault]);

    const activeBannerType = useMemo(() => {
        if (livePartyMovie && !isFestivalBannerDismissed) return 'WATCH_PARTY';
        const config = settings.crateFestConfig;
        const isCrateFestWindow = config?.isActive && config?.startDate && config?.endDate && 
                                (new Date() >= new Date(config.startDate) && new Date() <= new Date(config.endDate));
        if (isCrateFestWindow) return 'CRATE_FEST';
        if (isFestivalLive && !isFestivalBannerDismissed) return 'GENERAL_FESTIVAL';
        return 'NONE';
    }, [livePartyMovie, settings.crateFestConfig, isFestivalLive, isFestivalBannerDismissed]);

    const currentLiveHeroConfig = useMemo(() => {
        if (activeBannerType === 'CRATE_FEST') return settings.crateFestConfig;
        if (isFestivalLive) return festivalConfig;
        return null;
    }, [activeBannerType, isFestivalLive, settings.crateFestConfig, festivalConfig]);

    const crateFestMovies = useMemo(() => {
        const config = settings.crateFestConfig;
        if (!config) return [];
        const keys = config.movieBlocks.flatMap((b: any) => b.movieKeys);
        return keys.map((k: string) => movies[k]).filter((m: Movie | undefined): m is Movie => !!m);
    }, [movies, settings.crateFestConfig]);

    const comingSoonMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((m: Movie) => !!m && !isMovieReleased(m) && !m.isUnlisted)
            .sort((a: Movie, b: Movie) => new Date(a.releaseDateTime || 0).getTime() - new Date(b.releaseDateTime || 0).getTime());
    }, [movies]);

    const topTenMovies = useMemo(() => {
        return (Object.values(movies) as (Movie | undefined)[]).filter((m: Movie | undefined): m is Movie => !!m && isMovieReleased(m) && !m.isUnlisted && !!m.poster)
            .sort((a: Movie, b: Movie) => (viewCounts?.[b.key] || 0) - (viewCounts?.[a.key] || 0))
            .slice(0, 10);
    }, [movies, viewCounts]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase().trim();

        // 1. Synonym Map for common typos and broader genre mapping
        const synonyms: Record<string, string[]> = {
            'romance': ['love', 'date', 'romantic'],
            'drama': ['dramatic', 'serious'],
            'documentary': ['documentry', 'doc', 'docu', 'true story', 'non-fiction'],
            'horror': ['horr', 'scary', 'spooky', 'thrill'],
            'comedy': ['funny', 'laugh', 'humor']
        };

        // Expand query if it matches a known synonym key
        const expandedQueries = [query];
        Object.entries(synonyms).forEach(([key, list]) => {
            if (key === query || list.some(s => s === query)) {
                expandedQueries.push(key, ...list);
            }
        });

        // 2. Map category titles to their contained movie keys
        const matchingCategoryMovieKeys = new Set<string>();
        (Object.values(categories) as Category[]).forEach(cat => {
            const title = cat.title.toLowerCase();
            if (expandedQueries.some(q => title.includes(q))) {
                cat.movieKeys.forEach(key => matchingCategoryMovieKeys.add(key));
            }
        });

        // 3. Filter movies by metadata OR category match
        return (Object.values(movies) as Movie[]).filter((movie) =>
            movie && movie.poster && movie.title && !movie.isUnlisted && isMovieReleased(movie) &&
            (
                expandedQueries.some(q => (movie.title || '').toLowerCase().includes(q)) ||
                expandedQueries.some(q => (movie.director || '').toLowerCase().includes(q)) ||
                movie.cast.some(actor => expandedQueries.some(q => (actor.name || '').toLowerCase().includes(q))) ||
                matchingCategoryMovieKeys.has(movie.key)
            )
        );
    }, [searchQuery, movies, categories]);
    
    const likedMovies = useMemo<Set<string>>(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo<Set<string>>(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo<Set<string>>(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    
    const handlePlayMovie = (movie: Movie) => {
        const partyState = activeParties[movie.key];
        const isActuallyLive = !!partyState && partyState.status === 'live';

        if (movie.isWatchPartyEnabled && isActuallyLive) {
            window.history.pushState({}, '', `/watchparty/${movie.key}`);
            window.dispatchEvent(new Event('pushstate'));
        } else {
            if (movie.isWatchPartyEnabled && !isActuallyLive) {
                setDetailsMovie(movie);
            } else {
                window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
                window.dispatchEvent(new Event('pushstate'));
            }
        }
    };

    const handleSearchClick = () => {
        setSearchQuery('');
        setIsMobileSearchOpen(true);
    };

    const onSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    useEffect(() => {
        if (heroMovies.length > 1) {
            const interval = setInterval(() => setHeroIndex(prev => (prev + 1) % heroMovies.length), 8000);
            return () => clearInterval(interval);
        }
    }, [heroMovies.length]);

    if (isLoading) return <LoadingSpinner />;
    if (settings.maintenanceMode) return <MaintenanceScreen />;

    const headerTop = activeBannerType !== 'NONE' ? '3rem' : '0px';

    return (
        <div className="flex flex-col min-h-screen text-white overflow-x-hidden w-full relative">
            <SEO title="Home" description="Stream the best independent cinema." />
            <SmartInstallPrompt />
            
            {activeBannerType === 'WATCH_PARTY' && (
                <LiveWatchPartyBanner movie={livePartyMovie!} onClose={() => setIsFestivalBannerDismissed(true)} />
            )}
            {activeBannerType === 'CRATE_FEST' && settings.crateFestConfig && <CrateFestBanner config={settings.crateFestConfig} hasPass={hasCrateFestPass} />}
            {activeBannerType === 'GENERAL_FESTIVAL' && (
                <div 
                    onClick={() => { window.history.pushState({}, '', '/festival'); window.dispatchEvent(new Event('pushstate')); }}
                    className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 flex items-center justify-center gap-6 shadow-lg h-12 cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <span className="font-black uppercase text-[10px] tracking-widest">Festival Active</span>
                    </div>

                    <button className="bg-white text-indigo-600 font-black px-4 py-1 rounded-full text-[9px] uppercase tracking-widest hover:bg-gray-100 transition-all shadow-md">
                        Enter Portal
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); setIsFestivalBannerDismissed(true); }} className="text-white/50 hover:text-white text-xl leading-none">&times;</button>
                </div>
            )}

            <Header searchQuery={searchQuery} onSearch={onSearch} onMobileSearchClick={handleSearchClick} topOffset={headerTop} />

            <main className="flex-grow pb-24 md:pb-0 overflow-x-hidden transition-all duration-500" style={{ paddingTop: activeBannerType !== 'NONE' ? '3rem' : '0px' }}>
                {currentLiveHeroConfig ? (
                    <FestivalHero config={currentLiveHeroConfig} />
                ) : (
                    heroMovies.length > 0 && <Hero movies={heroMovies} currentIndex={heroIndex} onSetCurrentIndex={setHeroIndex} onPlayMovie={handlePlayMovie} onMoreInfo={handleSelectMovie} />
                )}
                
                <div className="px-4 md:px-12 relative z-10 w-full overflow-x-hidden">
                    <div className="-mt-6 md:-mt-10 lg:-mt-14 space-y-12 md:y-16 relative z-20">
                        {searchQuery ? (
                            <MovieCarousel title={searchResults.length > 0 ? `Results for "${searchQuery}"` : `No results for "${searchQuery}"`} movies={searchResults} onSelectMovie={handlePlayMovie} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} />
                        ) : (
                          <>
                            {topTenMovies.length > 0 && (
                                <MovieCarousel 
                                    title={
                                        <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-white px-2 border-l-4 border-red-600 pl-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                                            Top Ten Today
                                        </h2>
                                    } 
                                    movies={topTenMovies} 
                                    onSelectMovie={handlePlayMovie} 
                                    watchedMovies={watchedMovies} 
                                    watchlist={watchlist} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    onSupportMovie={() => {}} 
                                    showRankings={true}
                                />
                            )}

                            {vaultMovies.length > 0 && (
                                <CrateVaultRow 
                                    movies={vaultMovies} 
                                    onSelectMovie={handleSelectMovie} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    watchlist={watchlist} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    watchedMovies={watchedMovies}
                                />
                            )}

                            {crateFestMovies.length > 0 && <MovieCarousel title={<span className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-red-600">{settings.crateFestConfig?.title}</span>} movies={crateFestMovies} onSelectMovie={(m) => window.location.href='/cratefest'} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} />}
                            {comingSoonMovies.length > 0 && <MovieCarousel title="Premiering Soon" movies={comingSoonMovies} onSelectMovie={handleSelectMovie} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} isComingSoonCarousel={true} />}
                            
                            {Object.entries(categories).map(([key, category]) => {
                                const typedCategory = category as any;
                                if (['featured', 'nowStreaming', 'publicAccess', 'publicDomainIndie', 'zine', 'editorial', 'vault'].includes(key)) return null;
                                if ((key === 'cratemas' || (typedCategory.title || '').toLowerCase() === 'cratemas') && !settings.isHolidayModeActive) return null;
                                
                                const categoryMovies = typedCategory.movieKeys
                                    .map((movieKey: string) => movies[movieKey])
                                    .filter((m: Movie | undefined): m is Movie => !!m && !m.isUnlisted && isMovieReleased(m))
                                    .sort((a: Movie, b: Movie) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

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

            {detailsMovie && <MovieDetailsModal movie={detailsMovie} isLiked={likedMovies.has(detailsMovie.key)} onToggleLike={toggleLikeMovie} onClose={() => setDetailsMovie(null)} onSelectActor={setSelectedActor} allMovies={movies} allCategories={categories} onSelectRecommendedMovie={handleSelectMovie} onPlayMovie={handlePlayMovie} onSupportMovie={() => {}} />}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
            {isMobileSearchOpen && <SearchOverlay searchQuery={searchQuery} onSearch={onSearch} onClose={() => setIsMobileSearchOpen(false)} results={searchResults} onSelectMovie={(m) => { setIsMobileSearchOpen(false); handlePlayMovie(m); }} />}
        </div>
    );
};

export default App;
