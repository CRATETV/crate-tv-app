

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Movie, Actor, Category, FilmBlock, FestivalDay } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import FestivalHero from './components/FestivalHero';
import MovieCarousel from './components/MovieCarousel';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
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
import { useFestival } from './contexts/FestivalContext';
import { isMovieReleased } from './constants';
import BottomNavBar from './components/BottomNavBar';
import CollapsibleFooter from './components/CollapsibleFooter';
import SquarePaymentModal from './components/SquarePaymentModal';
import DonationSuccessModal from './components/DonationSuccessModal';

type DisplayedCategory = {
  key: string;
  title: React.ReactNode;
  movies: Movie[];
};

const App: React.FC = () => {
  const { user, watchlist, watchedMovies } = useAuth();
  const { isLoading, movies, categories, festivalData, festivalConfig, isFestivalLive, dataSource } = useFestival();
  
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isStaging, setIsStaging] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFestivalLiveModal, setShowFestivalLiveModal] = useState(false);
  const [showNewFilmModal, setShowNewFilmModal] = useState(false);
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);

  // State for centrally managed modals
  const [movieForSupport, setMovieForSupport] = useState<Movie | null>(null);
  const [isDonationSuccessModalOpen, setIsDonationSuccessModalOpen] = useState(false);
  const [lastDonationDetails, setLastDonationDetails] = useState<{amount: number; email?: string} | null>(null);

  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Create a memoized Set for efficient `isWatched` lookups in child components.
  const watchedMoviesSet = useMemo(() => new Set(watchedMovies), [watchedMovies]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const isStagingActive = params.get('env') === 'staging' || stagingSession === 'true';

    const initialSearch = params.get('search');
    if (initialSearch) {
        setSearchQuery(initialSearch);
    }

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
    }
    
    const hasSeenFeatureModal = localStorage.getItem('hasSeenActorAiFeature');
    if (!hasSeenFeatureModal) {
      setShowFeatureModal(true);
      localStorage.setItem('hasSeenActorAiFeature', 'true');
    }
    
    const hasSeenConsumedAnnouncement = localStorage.getItem('hasSeenConsumedAnnouncement');
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
  }, []);

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

  useEffect(() => {
    if (!isLoading && isFestivalLive) {
      const hasSeenModal = sessionStorage.getItem('hasSeenFestivalLiveModal');
      if (!hasSeenModal) {
        setShowFestivalLiveModal(true);
        sessionStorage.setItem('hasSeenFestivalLiveModal', 'true');
      }
    }
  }, [isLoading, isFestivalLive]);
  
  const heroMovies = useMemo(() => {
    if (!categories.featured?.movieKeys) return [];
    return categories.featured.movieKeys.map(key => movies[key]).filter(Boolean);
  }, [movies, categories.featured]);

  useEffect(() => {
    if (heroMovies.length > 1 && !isFestivalLive) { // Only run interval if not in festival mode
      heroIntervalRef.current = setInterval(() => {
        setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
      }, 7000);
    }
    return () => {
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, [heroMovies.length, isFestivalLive]);

  const handleSetHeroIndex = (index: number) => {
    setHeroIndex(index);
    if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
  };
  
  const visibleMovies = useMemo(() => {
    const now = new Date();
    return Object.values(movies).filter((movie: Movie) => {
        if (!movie) return false;
        const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
        return !expiryDate || expiryDate > now;
    });
  }, [movies]);

  const topTenMovies = useMemo(() => {
    return Object.values(movies)
        .filter((movie: Movie) => movie && typeof movie.likes === 'number')
        .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);
  }, [movies]);
  
  const nowPlayingMovie = movies['consumed'];
  const isNowPlayingReleased = isMovieReleased(nowPlayingMovie);

  const displayedCategories = useMemo(() => {
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
        
        if (key === 'pwff12thAnnual') { // Always hide the standard festival category from the main list
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

  }, [categories, visibleMovies, watchlist, movies]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    return visibleMovies.filter(movie =>
      (movie.title || '').toLowerCase().includes(lowercasedQuery) ||
      (movie.director || '').toLowerCase().includes(lowercasedQuery) ||
      (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, visibleMovies]);

  const handleOpenDetailsModal = useCallback((movie: Movie) => {
    setDetailsMovie(movie);
  }, []);

  const handlePlayMovie = useCallback((movieToPlay: Movie) => {
    window.history.pushState({}, '', `/movie/${movieToPlay.key}?play=true`);
    window.dispatchEvent(new Event('pushstate'));
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  const handleSelectActor = (actor: Actor) => {
    setDetailsMovie(null);
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
    setSelectedActor(null);
  };

  const handleCloseNewFilmModal = useCallback(() => {
    setShowNewFilmModal(false);
    localStorage.setItem('hasSeenConsumedAnnouncement', 'true');
  }, []);

  const handleSelectFromSearch = (movie: Movie) => {
    setIsMobileSearchOpen(false);
    handlePlayMovie(movie);
  };
  
  useEffect(() => {
    try {
      localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(likedMovies)));
    } catch (e) {
      console.warn("Could not write liked movies to localStorage.", e);
    }
  }, [likedMovies]);

  const toggleLikeMovie = useCallback(async (movieKey: string) => {
    const newLikedMovies = new Set(likedMovies);
    const action = newLikedMovies.has(movieKey) ? 'unlike' : 'like';

    if (action === 'unlike') {
        newLikedMovies.delete(movieKey);
    } else {
        newLikedMovies.add(movieKey);
    }
    setLikedMovies(newLikedMovies);

    try {
        const response = await fetch('/api/toggle-like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieKey, action }),
        });
        if (!response.ok) {
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

  const handleDonationSuccess = (details: { amount: number; email?: string }) => {
      setLastDonationDetails(details);
      setIsDonationSuccessModalOpen(true);
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
      />
      
      <main className="flex-grow pb-24 md:pb-0">
        {searchQuery && !isMobileSearchOpen ? (
           <div className="pt-8 md:pt-24 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-6 text-white">Search Results for "{searchQuery}"</h2>
            {searchResults.length > 0 ? (
                <MovieCarousel
                    title=""
                    movies={searchResults}
                    onSelectMovie={handlePlayMovie}
                    watchedMovies={watchedMoviesSet}
                    likedMovies={likedMovies}
                    onToggleLike={toggleLikeMovie}
                    onSupportMovie={setMovieForSupport}
                />
            ) : (
                <p className="text-gray-400">No results found.</p>
            )}
           </div>
        ) : (
            <>
              {isFestivalLive ? (
                <FestivalHero festivalConfig={festivalConfig} />
              ) : (
                <Hero
                  movies={heroMovies}
                  currentIndex={heroIndex}
                  onSetCurrentIndex={handleSetHeroIndex}
                  onPlayMovie={handlePlayMovie}
                  onMoreInfo={handleOpenDetailsModal}
                />
              )}
              <div className="relative z-10 mt-8 px-4 md:px-12">
                  {isFestivalLive && (
                    <div className="space-y-8 mb-8 md:mb-12">
                      {festivalData.map((day: FestivalDay) => day.blocks.map((block: FilmBlock) => {
                          const blockMovies = block.movieKeys.map(key => movies[key]).filter(Boolean);
                          if (blockMovies.length === 0) return null;
                          return (
                              <MovieCarousel
                                  key={block.id}
                                  title={
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-4">
                                          <h2 className="text-lg md:text-2xl font-bold text-white">{block.title}</h2>
                                          <p className="font-semibold text-purple-300 text-sm sm:text-base">{block.time}</p>
                                      </div>
                                  }
                                  movies={blockMovies}
                                  onSelectMovie={handlePlayMovie}
                                  watchedMovies={watchedMoviesSet}
                                  likedMovies={likedMovies}
                                  onToggleLike={toggleLikeMovie}
                                  onSupportMovie={setMovieForSupport}
                              />
                          );
                      }))}
                    </div>
                  )}

                {nowPlayingMovie && isNowPlayingReleased && (
                  <NowPlayingBanner movie={nowPlayingMovie} onSelectMovie={handleOpenDetailsModal} onPlayMovie={handlePlayMovie} />
                )}
                <div>
                  {topTenMovies.length > 0 && (
                    <MovieCarousel
                      title={
                        <a href="/top-ten" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/top-ten'); window.dispatchEvent(new Event('pushstate'));}} className="text-lg md:text-2xl font-bold mb-4 text-white hover:text-gray-300 transition-colors inline-block uppercase tracking-wider">Top 10 Today</a>
                      }
                      movies={topTenMovies}
                      onSelectMovie={handlePlayMovie}
                      showRankings={true}
                      watchedMovies={watchedMoviesSet}
                      likedMovies={likedMovies}
                      onToggleLike={toggleLikeMovie}
                      onSupportMovie={setMovieForSupport}
                    />
                  )}
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
                          onSelectMovie={handlePlayMovie}
                          watchedMovies={watchedMoviesSet}
                          likedMovies={likedMovies}
                          onToggleLike={toggleLikeMovie}
                          onSupportMovie={setMovieForSupport}
                      />
                  ) : null}
                  {displayedCategories.map(cat => (
                    <MovieCarousel
                      key={cat.key}
                      title={cat.title}
                      movies={cat.movies}
                      onSelectMovie={handlePlayMovie}
                      watchedMovies={watchedMoviesSet}
                      likedMovies={likedMovies}
                      onToggleLike={toggleLikeMovie}
                      onSupportMovie={setMovieForSupport}
                    />
                  ))}
                </div>
              </div>
            </>
        )}
      </main>
      
      <CollapsibleFooter showActorLinks={true} />
      <BackToTopButton />

      {detailsMovie && (
        <MovieDetailsModal
            movie={movies[detailsMovie.key] || detailsMovie}
            isLiked={likedMovies.has(detailsMovie.key)}
            onToggleLike={toggleLikeMovie}
            onClose={handleCloseDetailsModal}
            onSelectActor={handleSelectActor}
            allMovies={movies}
            allCategories={categories}
            onSelectRecommendedMovie={handlePlayMovie}
            onSupportMovie={setMovieForSupport}
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
          results={searchResults}
          onSelectMovie={handleSelectFromSearch}
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
            handlePlayMovie(movies['consumed']);
            handleCloseNewFilmModal();
          }}
        />
      )}
      {movieForSupport && !isDonationSuccessModalOpen && (
          <SquarePaymentModal
              movie={movieForSupport}
              paymentType="donation"
              onClose={() => setMovieForSupport(null)}
              onPaymentSuccess={handleDonationSuccess}
          />
      )}
      {isDonationSuccessModalOpen && lastDonationDetails && movieForSupport && (
          <DonationSuccessModal
              movieTitle={movieForSupport.title}
              directorName={movieForSupport.director}
              amount={lastDonationDetails.amount}
              email={lastDonationDetails.email}
              onClose={() => {
                  setIsDonationSuccessModalOpen(false);
                  setMovieForSupport(null);
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