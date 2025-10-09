import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService';
import { Movie, Actor, Category, FestivalConfig, FestivalDay } from './types';
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
import FestivalModal from './components/FestivalModal';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFestivalModal, setShowFestivalModal] = useState(false);

  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const isStagingActive = env === 'staging' || stagingSession === 'true';

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
      invalidateCache();
    }
    
    const hasSeenFeatureModal = sessionStorage.getItem('hasSeenActorAiFeature');
    if (!hasSeenFeatureModal) {
      setShowFeatureModal(true);
      sessionStorage.setItem('hasSeenActorAiFeature', 'true');
    }

    setIsLoading(true);

    const loadAppData = async () => {
      try {
        const { data: liveData, source } = await fetchAndCacheLiveData();
        setDataSource(source);
        
        // MOVIES
        const newMoviesState = { ...liveData.movies };
        Object.keys(newMoviesState).forEach((key: string) => {
          const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
          if (storedLikes) newMoviesState[key].likes = parseInt(storedLikes, 10);
        });
        setMovies(newMoviesState);
        
        // CATEGORIES
        setCategories(liveData.categories);
        
        // FESTIVAL DATA
        setFestivalConfig(liveData.festivalConfig);
        setFestivalData(liveData.festivalData);

        // Set modal visibility based on live status
        setShowFestivalModal(liveData.festivalConfig?.isFestivalLive ?? false);

        // LIKES
        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }
      } catch (error) {
        console.error("Failed to load S3 app data", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAppData();

    const handleScroll = () => setIsScrolled(window.pageYOffset > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, []);
  
  // Polling for festival status changes
  useEffect(() => {
    const checkFestivalStatus = async () => {
        invalidateCache(); // Invalidate cache to force a re-fetch
        const { data: liveData } = await fetchAndCacheLiveData();
        setFestivalConfig(liveData.festivalConfig);
        setFestivalData(liveData.festivalData);
        setShowFestivalModal(liveData.festivalConfig?.isFestivalLive ?? false);
    };

    const intervalId = setInterval(checkFestivalStatus, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);
  
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
      movie.title.toLowerCase().includes(lowercasedQuery) ||
      movie.director.toLowerCase().includes(lowercasedQuery) ||
      movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery))
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

  const handleCloseFestivalModal = () => {
    setShowFestivalModal(false);
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
      {showFestivalModal && festivalConfig && festivalData.length > 0 && (
        <FestivalModal
            festivalData={festivalData}
            festivalConfig={festivalConfig}
            allMovies={movies}
            onClose={handleCloseFestivalModal}
        />
      )}
      {showFeatureModal && (
        <FeatureModal onClose={() => setShowFeatureModal(false)} />
      )}
    </div>
  );
};

export default App;