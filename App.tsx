import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData } from './services/dataService';
import { Movie, Actor, Category, FestivalConfig, LiveData, FetchResult } from './types';
import Header from './components/Header';
// FIX: Corrected import path
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
// FIX: Corrected import path
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import BackToTopButton from './components/BackToTopButton';
import SearchOverlay from './components/SearchOverlay';
import StagingBanner from './components/StagingBanner';
import FeatureModal from './components/FeatureModal';
import DataStatusIndicator from './components/DataStatusIndicator';
import FestivalLiveModal from './components/FestivalLiveModal';
import NewFilmAnnouncementModal from './components/NewFilmAnnouncementModal';
import NowPlayingBanner from './components/NowPlayingBanner';
import { useAuth } from './contexts/AuthContext';
import { isMovieReleased } from './constants';
import BottomNavBar from './components/BottomNavBar';

const CACHE_KEY = 'cratetv-live-data';
const CACHE_TIMESTAMP_KEY = 'cratetv-live-data-timestamp';

interface BroadcastMessage {
  type: string;
  payload: LiveData;
}

// FIX: Define a specific type for displayed categories to resolve TypeScript inference issues in the useMemo hook.
type DisplayedCategory = {
  key: string;
  title: React.ReactNode;
  movies: Movie[];
};

const App: React.FC = () => {
  const { watchlist } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [isFestivalLive, setIsFestivalLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFestivalLiveModal, setShowFestivalLiveModal] = useState(false);
  const [showNewFilmModal, setShowNewFilmModal] = useState(false);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);

  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Simplified state update function. This is now the single point of truth for updating app data.
  const applyData = useCallback((result: FetchResult) => {
    setDataSource(result.source);
    setMovies(result.data.movies);
    setCategories(result.data.categories);
    setFestivalConfig(result.data.festivalConfig);
  }, []);

  const loadAppData = useCallback(async (options?: { force?: boolean }) => {
    try {
      const result = await fetchAndCacheLiveData({ force: options?.force });
      applyData(result);
    } catch (error) {
      console.error("Failed to load app data", error);
    }
  }, [applyData]);

  // Effect for initial load and one-time setup
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const isStagingActive = env === 'staging' || stagingSession === 'true';

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
      loadAppData({ force: true }).finally(() => setIsLoading(false));
    } else {
      loadAppData().finally(() => setIsLoading(false));
    }
    
    const hasSeenFeatureModal = sessionStorage.getItem('hasSeenActorAiFeature');
    if (!hasSeenFeatureModal) {
      setShowFeatureModal(true);
      sessionStorage.setItem('hasSeenActorAiFeature', 'true');
    }
    
    const hasSeenConsumedAnnouncement = sessionStorage.getItem('hasSeenConsumedAnnouncement');
    if (!hasSeenConsumedAnnouncement) {
        setShowNewFilmModal(true);
    }

    const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
    if (storedLikedMovies) {
      setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
    }

    const handleScroll = () => setIsScrolled(window.pageYOffset > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, [loadAppData]);

  // This single, robust effect manages all real-time data synchronization.
  // It replaces the unstable polling and complex timestamp logic.
  useEffect(() => {
    // --- BROADCAST CHANNEL for instant, reliable updates from the admin panel ---
    const channel = new BroadcastChannel('cratetv-data-channel');
    const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data?.type === 'DATA_PUBLISHED' && event.data.payload) {
        const liveData = event.data.payload;
        const now = Date.now();
        console.log(`[Broadcast] Received new data. Applying immediately.`);

        // Apply the new data directly to the state
        applyData({ data: liveData, source: 'live', timestamp: now });

        // CRITICAL: Overwrite the local cache with the guaranteed fresh data from the broadcast.
        // This prevents a race condition where a subsequent visibility change could fetch stale data from S3.
        try {
            const cachePayload = { data: liveData, source: 'live' };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        } catch(e) {
            console.warn("[Broadcast] Could not write new data to localStorage cache.", e);
        }
      }
    };
    channel.addEventListener('message', handleMessage);

    // --- VISIBILITY CHANGE for smart, efficient background updates ---
    const handleVisibilityChange = () => {
      // When the user returns to the tab, check for fresh data.
      if (document.visibilityState === 'visible') {
        console.log('[Visibility] Tab is now visible. Checking for fresh data.');
        loadAppData({ force: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- CLEANUP ---
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAppData, applyData]);

  // Effect to fetch AI-powered recommendations when liked movies change.
  useEffect(() => {
    const fetchRecommendations = async () => {
        if (likedMovies.size === 0 || Object.keys(movies).length === 0) {
            setRecommendedMovies([]);
            return;
        }

        try {
            const likedTitles = Array.from(likedMovies).map(key => movies[key]?.title).filter(Boolean);
            if (likedTitles.length === 0) return;

            const response = await fetch('/api/generate-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ likedTitles, allMovies: movies }),
            });

            if (!response.ok) {
                console.error("Failed to fetch recommendations.");
                return;
            }

            const { recommendedKeys } = await response.json();
            if (recommendedKeys && recommendedKeys.length > 0) {
                const recommended = recommendedKeys
                    .map((key: string) => movies[key])
                    .filter((movie: Movie | undefined): movie is Movie => !!movie);
                setRecommendedMovies(recommended);
            }
        } catch (error) {
            console.error("Error fetching recommendations:", error);
        }
    };
    fetchRecommendations();
  }, [likedMovies, movies]);

  // This effect dynamically and periodically checks if the festival is live.
  useEffect(() => {
    const checkStatus = () => {
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) {
            setIsFestivalLive(false);
            return;
        }
        const now = new Date();
        const start = new Date(festivalConfig.startDate);
        const end = new Date(festivalConfig.endDate);
        const isLive = now >= start && now < end;
        
        // Only update state if the value has changed to prevent unnecessary re-renders
        setIsFestivalLive(prevIsLive => {
            if (prevIsLive !== isLive) {
                return isLive;
            }
            return prevIsLive;
        });
    };

    checkStatus(); // Initial check
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds for responsiveness

    return () => clearInterval(interval); // Cleanup
  }, [festivalConfig]);


  // Effect to show the Festival Live modal once per session
  useEffect(() => {
    if (!isLoading && isFestivalLive) {
      const hasSeenModal = sessionStorage.getItem('hasSeenFestivalLiveModal');
      if (!hasSeenModal) {
        setShowFestivalLiveModal(true);
        sessionStorage.setItem('hasSeenFestivalLiveModal', 'true');
      }
    }
  }, [isLoading, isFestivalLive]);
  
  // Logic for the hero banner auto-scroll
  const heroMovies = useMemo(() => {
    if (!categories.featured?.movieKeys) return [];
    return categories.featured.movieKeys.map(key => movies[key]).filter(Boolean);
  }, [movies, categories.featured]);

  useEffect(() => {
    if (heroMovies.length > 1) {
      heroIntervalRef.current = setInterval(() => {
        setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
      }, 7000); // Change hero image every 7 seconds
    }
    return () => {
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, [heroMovies.length]);

  const handleSetHeroIndex = (index: number) => {
    setHeroIndex(index);
    if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
  };
  
  // Memoize visible movies to avoid re-calculation
  const visibleMovies = useMemo(() => {
    const now = new Date();
    return Object.values(movies).filter((movie: Movie) => {
        if (!movie) return false;
        const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
        return !expiryDate || expiryDate > now;
    });
  }, [movies]);

  // Re-architected category rendering logic for stability and mobile visibility.
  // 1. Memoize festival movies separately for dedicated rendering.
  const festivalLiveMovies = useMemo(() => {
    if (!isFestivalLive || !categories.pwff12thAnnual) {
        return null;
    }
    const festivalMovies = categories.pwff12thAnnual.movieKeys
        .map(movieKey => visibleMovies.find(m => m.key === movieKey))
        .filter((m): m is Movie => !!m);
    
    return festivalMovies.length > 0 ? festivalMovies : null;
  }, [isFestivalLive, categories, visibleMovies]);

  const topTenMovies = useMemo(() => {
    // FIX: Explicitly cast the parameters to type 'Movie' to resolve TypeScript inference errors.
    return Object.values(movies)
        .filter((movie: Movie) => movie && typeof movie.likes === 'number')
        .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);
  }, [movies]);
  
  const nowPlayingMovie = movies['consumed'];
  const isNowPlayingReleased = isMovieReleased(nowPlayingMovie);

  // 2. Memoize the remaining standard categories for the main display list.
  const displayedCategories = useMemo(() => {
    // Create My List category
    const watchlistMovies = (watchlist || [])
        .map(key => movies[key])
        .filter((m): m is Movie => !!m);

    const myListCategory: DisplayedCategory | null = watchlistMovies.length > 0 ? {
        key: 'myList',
        title: 'My List',
        movies: watchlistMovies,
    } : null;

    const baseCategoryOrder: string[] = ["newReleases", "awardWinners", "pwff12thAnnual", "comedy", "drama", "documentary", "exploreTitles"];
    
    const standardCategories = baseCategoryOrder
      .map((key): DisplayedCategory | null => {
        const category = categories[key];
        if (!category) return null;
        
        if (key === 'pwff12thAnnual' && isFestivalLive) {
            return null;
        }

        const categoryMovies = category.movieKeys
            .map(movieKey => visibleMovies.find(m => m.key === movieKey))
            .filter((m): m is Movie => !!m);

        if (categoryMovies.length === 0) return null;
        
        return {
            key: key,
            title: <h2 className="text-lg md:text-2xl font-bold mb-4 text-white">{category.title}</h2>,
            movies: categoryMovies,
        };
      })
      .filter((c): c is DisplayedCategory => !!c);
      
      return [myListCategory, ...standardCategories].filter((c): c is DisplayedCategory => !!c);

  }, [categories, isFestivalLive, visibleMovies, watchlist, movies]);
  
  // Filter movies based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    return visibleMovies.filter(movie =>
      (movie.title || '').toLowerCase().includes(lowercasedQuery) ||
      (movie.director || '').toLowerCase().includes(lowercasedQuery) ||
      (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, visibleMovies]);

  const handleSelectMovie = useCallback((movie: Movie) => {
    setDetailsMovie(movie);
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  const handleSelectActor = (actor: Actor) => {
    setDetailsMovie(null); // Close movie modal first
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
    setSelectedActor(null);
  };

  const handleCloseNewFilmModal = useCallback(() => {
    setShowNewFilmModal(false);
    sessionStorage.setItem('hasSeenConsumedAnnouncement', 'true');
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(likedMovies)));
    } catch (e) {
      console.warn("Could not write liked movies to localStorage.", e);
    }
  }, [likedMovies]);

  const toggleLikeMovie = useCallback(async (movieKey: string) => {
    const newLikedMovies = new Set(likedMovies);
    let likesChange = 0;
    const action = newLikedMovies.has(movieKey) ? 'unlike' : 'like';

    if (action === 'unlike') {
        newLikedMovies.delete(movieKey);
        likesChange = -1;
    } else {
        newLikedMovies.add(movieKey);
        likesChange = 1;
    }
    setLikedMovies(newLikedMovies);

    // Optimistically update the UI for immediate feedback.
    setMovies(prevMovies => {
        if (!prevMovies[movieKey]) return prevMovies;
        const updatedMovie = { 
            ...prevMovies[movieKey], 
            likes: Math.max(0, (prevMovies[movieKey].likes || 0) + likesChange) 
        };
        return { ...prevMovies, [movieKey]: updatedMovie };
    });

    // Persist the like to the server.
    try {
        const response = await fetch('/api/toggle-like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieKey, action }),
        });
        if (!response.ok) {
            // Optional: Handle server error, e.g., revert optimistic update.
            console.error("Failed to sync like with server.");
        }
    } catch (error) {
        console.error("Failed to send like update to server:", error);
    }
  }, [likedMovies]);
  
  const exitStaging = () => {
    sessionStorage.removeItem('crateTvStaging');
    const params = new URLSearchParams(window.location.search);
    params.delete('env');
    window.location.search = params.toString();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414]">
      {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
      <DataStatusIndicator source={dataSource} />
      <Header
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        isScrolled={isScrolled}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        isStaging={isStaging}
        isOffline={dataSource === 'fallback'}
        isFestivalLive={isFestivalLive}
      />
      
      <main className="flex-grow pb-24 md:pb-0">
        {searchQuery ? (
           <div className="pt-24 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-6 text-white">Search Results for "{searchQuery}"</h2>
            {searchResults.length > 0 ? (
                <MovieCarousel
                    title=""
                    movies={searchResults}
                    onSelectMovie={handleSelectMovie}
                />
            ) : (
                <p className="text-gray-400">No results found.</p>
            )}
           </div>
        ) : (
          <>
            <Hero
              movies={heroMovies}
              currentIndex={heroIndex}
              onSetCurrentIndex={handleSetHeroIndex}
              onSelectMovie={handleSelectMovie}
            />
            <div className="relative z-10 mt-8 px-4 md:px-12">
              {nowPlayingMovie && isNowPlayingReleased && (
                <NowPlayingBanner movie={nowPlayingMovie} onSelectMovie={handleSelectMovie} />
              )}
              <div>
                {/* Dedicated, stable rendering block for the live festival carousel */}
                {festivalLiveMovies && (
                    <MovieCarousel
                        key="festivalLive"
                        title={(() => {
                            const handleNavigateToFestival = () => {
                                window.history.pushState({}, '', '/festival');
                                window.dispatchEvent(new Event('pushstate'));
                            };
                            return (
                                <div className="flex items-center gap-4 mb-4 cursor-pointer" onClick={handleNavigateToFestival}>
                                    <h2 className="text-lg md:text-2xl font-bold text-white hover:text-gray-300 transition-colors">
                                        Film Festival
                                    </h2>
                                    <div className="flex items-center gap-2 bg-red-600 text-white font-bold text-sm px-3 py-1 rounded-md">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                        <span>LIVE NOW</span>
                                    </div>
                                </div>
                            );
                        })()}
                        movies={festivalLiveMovies}
                        onSelectMovie={handleSelectMovie}
                    />
                )}
                {/* Top 10 Carousel */}
                {topTenMovies.length > 0 && (
                    <MovieCarousel
                        key="topTen"
                        title={<a href="/top-ten" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/top-ten'); window.dispatchEvent(new Event('pushstate'));}} className="text-lg md:text-2xl font-bold mb-4 text-white hover:text-gray-300 transition-colors">Top 10 on Crate TV Today</a>}
                        movies={topTenMovies}
                        onSelectMovie={handleSelectMovie}
                        showRankings={false}
                    />
                )}
                {/* AI-Powered "For You" Carousel */}
                {likedMovies.size === 0 ? (
                    <div className="mb-8 md:mb-12">
                        <h2 className="text-lg md:text-2xl font-bold mb-4 text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Recommended For You
                        </h2>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center text-gray-300">
                            <p>
                                Click the <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mx-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg> 
                                on films you love to get personalized recommendations here!
                            </p>
                        </div>
                    </div>
                ) : recommendedMovies.length > 0 ? (
                    <MovieCarousel
                        key="recommended"
                        title={
                            <h2 className="text-lg md:text-2xl font-bold mb-4 text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Recommended For You
                            </h2>
                        }
                        movies={recommendedMovies}
                        onSelectMovie={handleSelectMovie}
                    />
                ) : null}
                {/* Map over the remaining, standard categories */}
                {displayedCategories.map(cat => (
                  <MovieCarousel
                    key={cat.key}
                    title={cat.title}
                    movies={cat.movies}
                    onSelectMovie={handleSelectMovie}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer showActorLinks={true} />
      <BackToTopButton />

      {detailsMovie && (
        <MovieDetailsModal
            movie={movies[detailsMovie.key] || detailsMovie} // Use updated movie from state
            isLiked={likedMovies.has(detailsMovie.key)}
            onToggleLike={toggleLikeMovie}
            onClose={handleCloseDetailsModal}
            onSelectActor={handleSelectActor}
            allMovies={movies}
            allCategories={categories}
            onSelectRecommendedMovie={handleSelectMovie}
        />
      )}
      {selectedActor && (
          <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
      )}
      {isMobileSearchOpen && (
        <SearchOverlay
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onClose={() => setIsMobileSearchOpen(false)}
        />
      )}
      {showFeatureModal && (
        <FeatureModal onClose={() => setShowFeatureModal(false)} />
      )}
      {showFestivalLiveModal && (
        <FestivalLiveModal
          onClose={() => setShowFestivalLiveModal(false)}
          onNavigate={() => {
            setShowFestivalLiveModal(false);
            window.history.pushState({}, '', '/festival');
            window.dispatchEvent(new Event('pushstate'));
          }}
        />
      )}
      {showNewFilmModal && movies['consumed'] && (
        <NewFilmAnnouncementModal
          movie={movies['consumed']}
          onClose={handleCloseNewFilmModal}
          onWatchNow={() => {
            handleSelectMovie(movies['consumed']);
            handleCloseNewFilmModal();
          }}
        />
      )}
      <BottomNavBar 
        onSearchClick={() => setIsMobileSearchOpen(true)}
      />
    </div>
  );
};

export default App;
