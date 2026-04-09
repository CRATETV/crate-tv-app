
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
import WatchPartyNotificationModal from './components/WatchPartyNotificationModal';
import CrateFestBanner from './components/CrateFestBanner';
import CrateVaultRow from './components/CrateVaultRow';
import CrateIntelligence from './components/CrateIntelligence';
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
    const { isLoading, movies, categories, isFestivalLive, festivalConfig, festivalData, settings, analytics, activeParties, allPartyStates, livePartyMovie, viewCounts } = useFestival();
    
    const [heroIndex, setHeroIndex] = useState(0);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [dismissedBannerKeys, setDismissedBannerKeys] = useState<Set<string>>(new Set());
    const [preloadVideoUrl, setPreloadVideoUrl] = useState<string | null>(null);
    const [showWatchPartyModal, setShowWatchPartyModal] = useState(false);
    const [watchPartyModalShown, setWatchPartyModalShown] = useState(false);
    
    const dismissBanner = useCallback((key: string) => {
        setDismissedBannerKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    // Listen for video preload requests from MovieCard hover
    useEffect(() => {
        const handlePreload = (e: CustomEvent<string>) => {
            if (e.detail && e.detail !== preloadVideoUrl) {
                setPreloadVideoUrl(e.detail);
            }
        };
        window.addEventListener('preloadVideo' as any, handlePreload);
        return () => window.removeEventListener('preloadVideo' as any, handlePreload);
    }, [preloadVideoUrl]);
    
    useEffect(() => {
        // Track general site visit
        fetch('/api/track-visit', { method: 'POST' }).catch(() => {});
        
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
        const config = settings.crateFestConfig;
        const isCrateFestWindow = config?.isActive && config?.startDate && config?.endDate && 
                                (new Date() >= new Date(config.startDate) && new Date() <= new Date(config.endDate));

        const isWatchPartyActuallyLive = livePartyMovie && activeParties[livePartyMovie.key]?.status === 'live';

        // Check if the party was explicitly ended - don't show banner for ended parties
        const isWatchPartyEnded = livePartyMovie && allPartyStates[livePartyMovie.key]?.status === 'ended';

        // Priority: 
        // 1. LIVE Watch Party (Always show if just turned live, even if upcoming was dismissed)
        // 2. Crate Fest (General event)
        // 3. Upcoming Watch Party (If not dismissed AND not ended)
        // 4. General Festival (If not dismissed)
        
        if (isWatchPartyActuallyLive) {
            const liveKey = `live-${livePartyMovie.key}`;
            if (!dismissedBannerKeys.has(liveKey)) return 'WATCH_PARTY';
        }

        if (isCrateFestWindow && !dismissedBannerKeys.has('cratefest')) return 'CRATE_FEST';
        
        // Don't show upcoming banner if party was terminated
        if (livePartyMovie && !isWatchPartyEnded && !dismissedBannerKeys.has(`upcoming-${livePartyMovie.key}`)) return 'WATCH_PARTY';
        
        if (isFestivalLive && !dismissedBannerKeys.has('festival')) return 'GENERAL_FESTIVAL';
        
        return 'NONE';
    }, [livePartyMovie, settings.crateFestConfig, isFestivalLive, dismissedBannerKeys, activeParties, allPartyStates]);

    const currentLiveHeroConfig = useMemo(() => {
        const crateFestConfig = settings.crateFestConfig;
        const isCrateFestActive = crateFestConfig?.isActive && crateFestConfig?.startDate && crateFestConfig?.endDate && 
                                (new Date() >= new Date(crateFestConfig.startDate) && new Date() <= new Date(crateFestConfig.endDate));
        
        // Priority for Hero:
        // 1. LIVE Watch Party (If not dismissed)
        // 2. Crate Fest (General event)
        // 3. General Festival (General event)
        
        const isWatchPartyActuallyLive = livePartyMovie && activeParties[livePartyMovie.key]?.status === 'live';
        if (isWatchPartyActuallyLive && !dismissedBannerKeys.has(`live-${livePartyMovie.key}`)) {
            // Synthesize a config for FestivalHero to render the live movie
            return {
                title: livePartyMovie.title,
                tagline: 'Live Watch Party Now Active',
                description: livePartyMovie.synopsis || 'Join the global screening and chat live with the community.',
                heroImage: livePartyMovie.rokuHeroImage || livePartyMovie.tvPoster || livePartyMovie.poster,
                isWatchParty: true,
                movieKey: livePartyMovie.key
            } as any;
        }

        if (isCrateFestActive) return crateFestConfig;
        if (isFestivalLive) return festivalConfig;
        return null;
    }, [isFestivalLive, settings.crateFestConfig, festivalConfig, livePartyMovie, activeParties, dismissedBannerKeys]);

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

    const premierMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m && isMovieReleased(m) && !m.isUnlisted && m.isForSale)
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }, [movies]);

    const upcomingWatchPartyMovie = useMemo(() => {
        const now = new Date();
        const twoHoursInMs = 2 * 60 * 60 * 1000;
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

        const isEligible = (startTimeStr: string, key: string) => {
            const start = new Date(startTimeStr);
            const diff = start.getTime() - now.getTime();
            // Never show if explicitly ended
            if (allPartyStates[key]?.status === 'ended') return false;
            // Never show if currently live (lobby handles this)
            if (activeParties[key]?.status === 'live') return false;
            // Show if upcoming within 7 days
            if (diff > 0 && diff < sevenDaysInMs) return true;
            // Show for up to 30 minutes after scheduled start
            // (in case auto-start is delayed) — but not longer
            if (diff <= 0 && diff > -30 * 60 * 1000) return true;
            return false;
        };

        // Check regular movies first
        const movieResult = (Object.values(movies) as Movie[])
            .filter(m => !!m && m.isWatchPartyEnabled && m.watchPartyStartTime && !m.isUnlisted)
            .filter(m => isEligible(m.watchPartyStartTime!, m.key))
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime())[0] || null;

        // Check festival blocks (regular festival + Crate Fest)
        const allBlocks = [
            ...festivalData.flatMap(d => d.blocks),
            ...(settings.crateFestConfig?.movieBlocks || [])
        ];

        const blockResult = allBlocks
            .filter(b => b.isWatchPartyEnabled && b.watchPartyStartTime)
            .filter(b => isEligible(b.watchPartyStartTime!, b.id))
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime())[0] || null;

        // Return whichever starts sooner
        if (!movieResult && !blockResult) return null;
        if (!movieResult) return {
            key: blockResult!.id,
            title: blockResult!.title,
            director: 'Festival Event',
            watchPartyStartTime: blockResult!.watchPartyStartTime,
            isWatchPartyEnabled: true,
            isWatchPartyPaid: (blockResult!.price || 0) > 0,
            watchPartyPrice: blockResult!.price,
            poster: movies[blockResult!.movieKeys?.[0]]?.poster || '',
            isUnlisted: false,
        } as Movie;
        if (!blockResult) return movieResult;

        // Both exist — return whichever starts sooner
        const movieTime = new Date(movieResult.watchPartyStartTime!).getTime();
        const blockTime = new Date(blockResult.watchPartyStartTime!).getTime();
        if (blockTime < movieTime) {
            return {
                key: blockResult.id,
                title: blockResult.title,
                director: 'Festival Event',
                watchPartyStartTime: blockResult.watchPartyStartTime,
                isWatchPartyEnabled: true,
                isWatchPartyPaid: (blockResult.price || 0) > 0,
                watchPartyPrice: blockResult.price,
                poster: movies[blockResult.movieKeys?.[0]]?.poster || '',
                isUnlisted: false,
            } as Movie;
        }
        return movieResult;
    }, [movies, allPartyStates, activeParties, festivalData, settings]);

    // Show watch party notification once per session after user logs in
    useEffect(() => {
        if (user && upcomingWatchPartyMovie && !watchPartyModalShown && !isLoading) {
            const sessionKey = `wp_notified_${upcomingWatchPartyMovie.key}`;
            if (!sessionStorage.getItem(sessionKey)) {
                setTimeout(() => setShowWatchPartyModal(true), 1500);
                setWatchPartyModalShown(true);
                sessionStorage.setItem(sessionKey, 'true');
            }
        }
    }, [user, upcomingWatchPartyMovie, watchPartyModalShown, isLoading]);

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

    const continueWatchingMovies = useMemo(() => {
        if (!user?.playbackProgress) return [];
        return Object.entries(user.playbackProgress)
            .map(([key, progress]) => {
                const movie = movies[key];
                if (!movie) return null;
                // Only show if progress is between 1% and 95%
                // We don't have duration here easily, but we can assume if it's in progress it's worth showing
                // unless it's explicitly marked as watched or progress is 0
                if (progress <= 0 || watchedMovies.has(key)) return null;
                return { movie, progress };
            })
            .filter((item): item is { movie: Movie; progress: number } => !!item)
            .sort((a, b) => (b.progress) - (a.progress)) // Simple sort by progress for now, ideally by last updated
            .map(item => item.movie)
            .slice(0, 10);
    }, [user?.playbackProgress, movies, watchedMovies]);

    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    
    // Handle movie playback navigation with instant-on logic (v1.1 - optimized for immediate playback)
    const handlePlayMovie = (movie: Movie) => {
        const partyState = activeParties[movie.key];
        const isActuallyLive = !!partyState && partyState.status === 'live';

        if (movie.isWatchPartyEnabled && isActuallyLive) {
            window.history.pushState({}, '', `/watchparty/${movie.key}`);
            window.dispatchEvent(new Event('pushstate'));
        } else {
            // Always go to movie page with play=true for instant playback
            window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
            window.dispatchEvent(new Event('pushstate'));
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

    const mainPaddingTop = useMemo(() => {
        const bannerHeight = activeBannerType !== 'NONE' ? 48 : 0;
        const isHomePage = window.location.pathname === '/';
        // If we are on the home page, we want the hero to go under the header (overlay)
        // If we are on other pages, we need to clear the header (approx 80px).
        if (!isHomePage) return `${bannerHeight + 80}px`;
        return `${bannerHeight}px`;
    }, [activeBannerType]);

    return (
        <div className="flex flex-col min-h-screen text-white overflow-x-hidden w-full relative">
            <SEO title="Home" description="Stream the best independent cinema." />
            <SmartInstallPrompt />

            {/* Watch Party Notification Modal — shows once per session on login */}
            {showWatchPartyModal && upcomingWatchPartyMovie && (
                <WatchPartyNotificationModal
                    movie={upcomingWatchPartyMovie}
                    onGetTicket={() => {
                        setShowWatchPartyModal(false);
                        window.history.pushState({}, '', `/watchparty/${upcomingWatchPartyMovie.key}`);
                        window.dispatchEvent(new Event('pushstate'));
                    }}
                    onDismiss={() => setShowWatchPartyModal(false)}
                />
            )}

            {/* Watch Party Ticket Notification — announcement card */}
            
            {activeBannerType === 'WATCH_PARTY' && (
                <LiveWatchPartyBanner 
                    movie={livePartyMovie!} 
                    onClose={() => {
                        const isLive = activeParties[livePartyMovie!.key]?.status === 'live';
                        dismissBanner(isLive ? `live-${livePartyMovie!.key}` : `upcoming-${livePartyMovie!.key}`);
                    }} 
                />
            )}
            {activeBannerType === 'CRATE_FEST' && settings.crateFestConfig && (
                <CrateFestBanner 
                    config={settings.crateFestConfig} 
                    hasPass={hasCrateFestPass} 
                    onClose={() => dismissBanner('cratefest')} 
                />
            )}
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

                    <button onClick={(e) => { e.stopPropagation(); dismissBanner('festival'); }} className="text-white/50 hover:text-white text-xl leading-none">&times;</button>
                </div>
            )}

            <Header 
                searchQuery={searchQuery} 
                onSearch={onSearch} 
                onMobileSearchClick={handleSearchClick} 
                topOffset={activeBannerType !== 'NONE' ? '3rem' : '0px'} 
                hideLiveSpotlight={activeBannerType === 'WATCH_PARTY'}
            />

            <main className="flex-grow pb-24 md:pb-0 overflow-x-hidden transition-all duration-500" style={{ paddingTop: mainPaddingTop }}>
                {currentLiveHeroConfig ? (
                    <FestivalHero config={currentLiveHeroConfig} />
                ) : (
                    heroMovies.length > 0 && <Hero movies={heroMovies} currentIndex={heroIndex} onSetCurrentIndex={setHeroIndex} onPlayMovie={handlePlayMovie} onMoreInfo={handleSelectMovie} />
                )}
                
                <div className="px-4 md:px-12 relative z-10 w-full overflow-x-hidden">
                    <div className="-mt-6 md:-mt-10 lg:-mt-14 space-y-12 md:y-16 relative z-20">
                        {searchQuery ? (
                            <MovieCarousel title={searchResults.length > 0 ? `Results for "${searchQuery}"` : `No results for "${searchQuery}"`} movies={searchResults} onSelectMovie={handlePlayMovie} onShowDetails={handleSelectMovie} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} />
                        ) : (
                          <>
                        {continueWatchingMovies.length > 0 && (
                                <MovieCarousel 
                                    title={
                                        <div className="flex items-center gap-3 mb-4 px-2 border-l-4 border-red-600 pl-4">
                                            <h2 className="text-lg md:text-2xl font-bold text-white uppercase italic tracking-tighter">
                                                Continue Watching
                                            </h2>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Pick up where you left off</span>
                                        </div>
                                    } 
                                    movies={continueWatchingMovies} 
                                    onSelectMovie={handlePlayMovie} 
                                    onShowDetails={handleSelectMovie}
                                    watchedMovies={watchedMovies} 
                                    watchlist={watchlist} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    onSupportMovie={() => {}} 
                                />
                            )}

                            {topTenMovies.length > 0 && (
                                <MovieCarousel 
                                    title={
                                        <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-white px-2 border-l-4 border-red-600 pl-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                                            Top Ten Today
                                        </h2>
                                    } 
                                    movies={topTenMovies} 
                                    onSelectMovie={handlePlayMovie} 
                                    onShowDetails={handleSelectMovie}
                                    watchedMovies={watchedMovies} 
                                    watchlist={watchlist} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    onSupportMovie={() => {}} 
                                    showRankings={true}
                                />
                            )}

                            <CrateIntelligence allMovies={movies} onSelectMovie={handlePlayMovie} />

                            {premierMovies.length > 0 && (
                                <MovieCarousel 
                                    title={
                                        <div className="flex items-center gap-3 mb-4 px-2 border-l-4 border-red-600 pl-4">
                                            <h2 className="text-lg md:text-2xl font-bold text-white uppercase italic tracking-tighter">
                                                Premier Access
                                            </h2>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Paid Content</span>
                                        </div>
                                    } 
                                    movies={premierMovies} 
                                    onSelectMovie={handlePlayMovie} 
                                    onShowDetails={handleSelectMovie}
                                    watchedMovies={watchedMovies} 
                                    watchlist={watchlist} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    onSupportMovie={() => {}} 
                                    categoryKey="premier"
                                />
                            )}

                            {vaultMovies.length > 0 && (
                                <CrateVaultRow 
                                    movies={vaultMovies} 
                                    onSelectMovie={handlePlayMovie} 
                                    likedMovies={likedMovies} 
                                    onToggleLike={toggleLikeMovie} 
                                    watchlist={watchlist} 
                                    onToggleWatchlist={toggleWatchlist} 
                                    watchedMovies={watchedMovies}
                                />
                            )}

                            {crateFestMovies.length > 0 && <MovieCarousel title={<span className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-red-600">{settings.crateFestConfig?.title}</span>} movies={crateFestMovies} onSelectMovie={(m) => window.location.href='/cratefest'} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} categoryKey="cratefest" />}
                            {comingSoonMovies.length > 0 && <MovieCarousel title="Premiering Soon" movies={comingSoonMovies} onSelectMovie={handlePlayMovie} onShowDetails={handleSelectMovie} watchedMovies={watchedMovies} watchlist={watchlist} likedMovies={likedMovies} onToggleLike={toggleLikeMovie} onToggleWatchlist={toggleWatchlist} onSupportMovie={() => {}} isComingSoonCarousel={true} categoryKey="comingSoon" />}
                            
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
                                    onShowDetails={handleSelectMovie}
                                        watchedMovies={watchedMovies} 
                                        watchlist={watchlist} 
                                        likedMovies={likedMovies} 
                                        onToggleLike={toggleLikeMovie} 
                                        onToggleWatchlist={toggleWatchlist} 
                                        onSupportMovie={() => {}} 
                                        categoryKey={key}
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

            {/* Hidden video element for preloading - starts buffering on hover */}
            {preloadVideoUrl && (
                <video 
                    src={preloadVideoUrl} 
                    preload="auto" 
                    muted 
                    className="hidden" 
                    aria-hidden="true"
                />
            )}

            {detailsMovie && <MovieDetailsModal movie={detailsMovie} isLiked={likedMovies.has(detailsMovie.key)} onToggleLike={toggleLikeMovie} onClose={() => setDetailsMovie(null)} onSelectActor={setSelectedActor} allMovies={movies} allCategories={categories} onSelectRecommendedMovie={handlePlayMovie} onPlayMovie={handlePlayMovie} onSupportMovie={() => {}} />}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
            {isMobileSearchOpen && <SearchOverlay searchQuery={searchQuery} onSearch={onSearch} onClose={() => setIsMobileSearchOpen(false)} results={searchResults} onSelectMovie={(m) => { setIsMobileSearchOpen(false); handlePlayMovie(m); }} />}
        </div>
    );
};

export default App;
