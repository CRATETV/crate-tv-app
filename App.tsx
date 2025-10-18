import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData } from './services/dataService';
import { Movie, Actor, Category, FestivalConfig } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import BackToTopButton from './components/BackToTopButton';
import SearchOverlay from './components/SearchOverlay';
import StagingBanner from './components/StagingBanner';
import FeatureModal from './components/FeatureModal';
import DataStatusIndicator from './components/DataStatusIndicator';
import FestivalLiveModal from './components/FestivalLiveModal'; // The announcement modal

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFestivalLiveModal, setShowFestivalLiveModal] = useState(false);

  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const loadAppData = useCallback(async (options?: { initialLoad?: boolean, force?: boolean }) => {
    if (options?.initialLoad) setIsLoading(true);
    try {
      const { data: liveData, source } = await fetchAndCacheLiveData({ force: options?.force });
      
      setDataSource(source);
      
      const newMoviesState = { ...liveData.movies };
      Object.keys(newMoviesState).forEach((key: string) => {
        const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
        if (storedLikes) newMoviesState[key].likes = parseInt(storedLikes, 10);
      });
      setMovies(newMoviesState);
      
      setCategories(liveData.categories);
      
      // Use a functional update to compare the new data with the previous state.
      // This allows us to detect when the festival *changes* to live, which is crucial
      // for the polling and visibility-change refresh mechanisms.
      setFestivalConfig(currentConfig => {
        const wasFestivalLive = currentConfig?.isFestivalLive;
        const isNowFestivalLive = liveData.festivalConfig?.isFestivalLive;

        // Trigger the announcement modal only if the festival just went live.
        if (isNowFestivalLive && !wasFestivalLive) {
          const hasSeenAnnouncement = sessionStorage.getItem('seenFestivalAnnouncement');
          if (!hasSeenAnnouncement) {
            setShowFestivalLiveModal(true);
            sessionStorage.setItem('seenFestivalAnnouncement', 'true');
          }
        }
        return liveData.festivalConfig;
      });
      
      if (options?.initialLoad) {
        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }
      }
    } catch (error) {
      console.error("Failed to load app data", error);
    } finally {
      if (options?.initialLoad) setIsLoading(false);
    }
  }, []);

  // Effect for initial load and one-time setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const isStagingActive = env === 'staging' || stagingSession === 'true';

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
      // Force a fresh load for staging to ensure latest data is seen
      loadAppData({ initialLoad: true, force: true });
    } else {
      loadAppData({ initialLoad: true });
    }
    
    const hasSeenFeatureModal = sessionStorage.getItem('hasSeenActorAiFeature');
    if (!hasSeenFeatureModal) {
      setShowFeatureModal(true);
      sessionStorage.setItem('hasSeenActorAiFeature', 'true');
    }

    const handleScroll = () => setIsScrolled(window.pageYOffset > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, [loadAppData]);
  
  // Effect to listen for instant updates from the admin panel
  useEffect(() => {
    const channel = new BroadcastChannel('cratetv-data-channel');
    
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === 'DATA_PUBLISHED' && event.data.payload) {
          const liveData = event.data.payload;
          
          if (!liveData || typeof liveData !== 'object' || !liveData.movies || !liveData.categories || !liveData.festivalConfig) {
            return;
          }

          // Update all data directly
          setDataSource('live');
          setMovies(liveData.movies || {});
          setCategories(liveData.categories || {});
          setFestivalConfig(liveData.festivalConfig || null);

          // Check if we need to show the announcement modal
          const isFestivalLive = !!liveData.festivalConfig?.isFestivalLive;
          if (isFestivalLive) {
              const hasSeenAnnouncement = sessionStorage.getItem('seenFestivalAnnouncement');
              if (!hasSeenAnnouncement) {
                setShowFestivalLiveModal(true);
                sessionStorage.setItem('seenFestivalAnnouncement', 'true');
              }
          }

          // Also update the session storage cache to keep it consistent
          try {
              const result = { data: liveData, source: 'live' };
              sessionStorage.setItem('cratetv-live-data', JSON.stringify(result));
              sessionStorage.setItem('cratetv-live-data-timestamp', Date.now().toString());
          } catch(e) {
              console.warn("Could not write to session storage cache on broadcast.", e);
          }
        }
      } catch (err) {
        console.error("Error processing broadcast message in App.tsx:", err);
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // Effect to handle data refresh when tab becomes visible again (e.g., on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const lastPublishTimeStr = localStorage.getItem('cratetv-last-publish-timestamp');
          const lastCacheTimeStr = sessionStorage.getItem('cratetv-live-data-timestamp');

          if (lastPublishTimeStr && lastCacheTimeStr) {
            const lastPublishTime = parseInt(lastPublishTimeStr, 10);
            const lastCacheTime = parseInt(lastCacheTimeStr, 10);
            
            if (lastPublishTime > lastCacheTime) {
              console.warn('[Visibility] Data is stale. A publish event occurred while tab was in background. Forcing data refresh.');
              // We don't want to show the main loading spinner, just refresh in the background.
              loadAppData({ force: true });
            } else {
              console.log('[Visibility] Data is fresh. No refresh needed.');
            }
          }
        } catch (e) {
          console.error('[Visibility] Error checking for stale data:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAppData]);
  
  // Effect for periodic data refresh to catch live updates across devices
  useEffect(() => {
    // This interval ensures that the app periodically checks for new data from the server.
    // A very short interval is crucial for making admin updates (like making the festival live)
    // feel "immediate" to users on other devices, especially mobile.
    // NOTE: For a very large user base, a more scalable solution like WebSockets would be
    // preferable to reduce server load, but aggressive polling is effective for this use case.
    const pollingInterval = setInterval(() => {
      console.log('[Polling] Periodically checking for live data updates.');
      loadAppData({ force: true });
    }, 1000); // Poll every 1 second for an "immediate" experience

    return () => {
      clearInterval(pollingInterval); // Cleanup on component unmount
    };
  }, [loadAppData]);
  
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
    // FIX: Add explicit type to the 'movie' parameter to fix TypeScript inference issue.
    return Object.values(movies).filter((movie: Movie) => {
        if (!movie) return false;
        const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
        return !expiryDate || expiryDate > now;
    });
  }, [movies]);
  
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
  
  const toggleLikeMovie = useCallback((movieKey: string) => {
    const newLikedMovies = new Set(likedMovies);
    let likesChange = 0;

    if (newLikedMovies.has(movieKey)) {
      newLikedMovies.delete(movieKey);
      likesChange = -1;
    } else {
      newLikedMovies.add(movieKey);
      likesChange = 1;
    }

    setLikedMovies(newLikedMovies);
    localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));

    // Update the likes count in the main movies state
    setMovies(prevMovies => {
      const updatedMovie = { 
        ...prevMovies[movieKey], 
        likes: Math.max(0, (prevMovies[movieKey].likes || 0) + likesChange) 
      };
      localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
      return { ...prevMovies, [movieKey]: updatedMovie };
    });
  }, [likedMovies]);
  
  const exitStaging = () => {
    sessionStorage.removeItem('crateTvStaging');
    const params = new URLSearchParams(window.location.search);
    params.delete('env');
    window.location.search = params.toString();
  };

  const handleNavigateToFestival = () => {
    setShowFestivalLiveModal(false);
    window.history.pushState({}, '', '/festival');
    window.dispatchEvent(new Event('pushstate'));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const categoryOrder: (keyof typeof categories)[] = ["newReleases", "awardWinners", "pwff12thAnnual", "comedy", "drama", "documentary", "exploreTitles"];

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
        isFestivalLive={festivalConfig?.isFestivalLive}
      />
      
      <main className="flex-grow">
        {searchQuery ? (
           <div className="pt-24 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-6 text-white">Search Results for "{searchQuery}"</h2>
            {searchResults.length > 0 ? (
                <MovieCarousel
                    title=""
                    movies={searchResults}
                    onSelectMovie={handleSelectMovie}
                    hideTitleOnMobile
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
            <div className="relative z-10 -mt-12 px-4 md:px-12">
              <div>
                {categoryOrder.map(key => {
                  const category = categories[key];
                  if (!category) return null;
                  const categoryMovies = category.movieKeys
                    .map(movieKey => visibleMovies.find(m => m.key === movieKey))
                    .filter((m): m is Movie => !!m);

                  if (categoryMovies.length === 0) return null;

                  return (
                    <MovieCarousel
                      key={key}
                      title={category.title}
                      movies={categoryMovies}
                      onSelectMovie={handleSelectMovie}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
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
      {showFestivalLiveModal && festivalConfig && (
        <FestivalLiveModal
            config={festivalConfig}
            onClose={() => setShowFestivalLiveModal(false)}
            onNavigate={handleNavigateToFestival}
        />
      )}
      {showFeatureModal && (
        <FeatureModal onClose={() => setShowFeatureModal(false)} />
      )}
    </div>
  );
};

export default App;