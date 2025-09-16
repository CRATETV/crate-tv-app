import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import MovieCarousel from './components/MovieCarousel.tsx';
import Footer from './components/Footer.tsx';
import MovieDetailsModal from './components/MovieDetailsModal.tsx';
import ActorBioModal from './components/ActorBioModal.tsx';
import SearchOverlay from './components/SearchOverlay.tsx';
import StagingBanner from './components/StagingBanner.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import BackToTopButton from './components/BackToTopButton.tsx';
import DataStatusIndicator from './components/DataStatusIndicator.tsx';
import FeatureModal from './components/FeatureModal.tsx';
import FestivalView from './components/FestivalView.tsx'; // Import FestivalView
// FIX: Imported the MovieCard component to resolve the 'Cannot find name' error.
import MovieCard from './components/MovieCard.tsx';

// Services and types
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import { Movie, Actor, Category, FestivalConfig, FestivalDay } from './types.ts';
import { useAuth } from './contexts/AuthContext.tsx';


function App() {
  // State variables
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [heroIndex, setHeroIndex] = useState(0);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const { user, subscribe } = useAuth();

  const loadAppData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, source } = await fetchAndCacheLiveData();
      setDataSource(source);

      // Initialize movies with likes from local storage
      const newMoviesState = { ...data.movies };
      Object.keys(newMoviesState).forEach(key => {
        const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
        if (storedLikes) {
          newMoviesState[key].likes = parseInt(storedLikes, 10);
        }
      });
      setMovies(newMoviesState);

      setCategories(data.categories);
      setFestivalData(data.festivalData);
      setFestivalConfig(data.festivalConfig);

      // Initialize liked set from local storage
      const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
      if (storedLikedMovies) {
        setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
      }
      
      // Feature modal logic
      const hasSeenModal = localStorage.getItem('hasSeenAiFactFeature');
      if (!hasSeenModal) {
        setShowFeatureModal(true);
        localStorage.setItem('hasSeenAiFactFeature', 'true');
      }

    } catch (error) {
      console.error("Failed to load app data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data load, environment check, and live update listener
  useEffect(() => {
    // Check for staging env
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    if (env === 'staging' || sessionStorage.getItem('crateTvStaging') === 'true') {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
    }
    
    // Check for search query in URL
    const urlSearchQuery = params.get('search');
    if (urlSearchQuery) {
        setSearchQuery(urlSearchQuery);
    }

    // Load main app data
    loadAppData();

    // Critical fix: Listen for live data updates from the admin panel
    const broadcastChannel = new BroadcastChannel('cratetv-data-update');
    const handleMessage = () => {
      console.log("Live update signal received. Refreshing data...");
      invalidateCache(); // Clear the cache to force a fresh fetch
      loadAppData();
    };
    broadcastChannel.addEventListener('message', handleMessage);

    return () => {
      broadcastChannel.removeEventListener('message', handleMessage);
      broadcastChannel.close();
    };

  }, [loadAppData]);

  // Handle scroll for header transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Hero slider logic
  useEffect(() => {
    const featuredCategory = categories['featured'];
    if (featuredCategory && featuredCategory.movieKeys.length > 0) {
      const interval = setInterval(() => {
        setHeroIndex(prevIndex => (prevIndex + 1) % featuredCategory.movieKeys.length);
      }, 7000); // Change hero every 7 seconds
      return () => clearInterval(interval);
    }
  }, [categories]);

  // Memoized lists of movies
  const heroMovies = useMemo(() => {
    const featuredCategory = categories['featured'];
    if (!featuredCategory) return [];
    return featuredCategory.movieKeys.map(key => movies[key]).filter(Boolean);
  }, [movies, categories]);
  
  const allVisibleMovies = useMemo(() => {
      return Object.values(movies).filter(movie => {
          const expiry = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
          return !expiry || expiry > new Date();
      });
  }, [movies]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    return allVisibleMovies.filter(movie =>
      movie.title.toLowerCase().includes(lowercasedQuery) ||
      movie.director.toLowerCase().includes(lowercasedQuery) ||
      movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, allVisibleMovies]);

  // Handlers (using useCallback for performance)
  const handleSelectMovie = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setSelectedMovie(null);
    // On modal close, remove movie key from URL
    const url = new URL(window.location.href);
    url.pathname = '/';
    window.history.replaceState({}, '', url);
  }, []);

  const handleSelectActor = useCallback((actor: Actor) => {
    setSelectedActor(actor);
  }, []);

  const handleCloseActorModal = useCallback(() => {
    setSelectedActor(null);
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
      setSearchQuery(query);
      setIsMobileSearchOpen(false);
      // Update URL with search query
      const url = new URL(window.location.href);
      url.searchParams.set('search', query);
      window.history.replaceState({}, '', url);
  }, []);

  const toggleLikeMovie = useCallback((movieKey: string) => {
    setLikedMovies(prevLiked => {
      const newLiked = new Set(prevLiked);
      let likesChange = 0;
      if (newLiked.has(movieKey)) {
        newLiked.delete(movieKey);
        likesChange = -1;
      } else {
        newLiked.add(movieKey);
        likesChange = 1;
      }
      localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLiked)));
      
      // Update the likes count in the main movies state
      setMovies(prevMovies => {
          const currentLikes = prevMovies[movieKey]?.likes || 0;
          const newLikes = Math.max(0, currentLikes + likesChange);
          const updatedMovie = { ...prevMovies[movieKey], likes: newLikes };
          // Persist individual movie like count
          localStorage.setItem(`cratetv-${movieKey}-likes`, newLikes.toString());
          return { ...prevMovies, [movieKey]: updatedMovie };
      });

      return newLiked;
    });
  }, []);
  
  const handleSubscribe = () => {
      if(user) {
          subscribe();
      } else {
          // Redirect to login, then to premium
          window.history.pushState({}, '', '/login?redirect=/premium');
          window.dispatchEvent(new Event('pushstate'));
      }
  };


  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Define which categories to show on the main page
  const mainPageCategoryKeys = [
    'newReleases',
    'awardWinners',
    'pwff12thAnnual',
    'comedy',
    'drama',
    'documentary',
    'exploreTitles'
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#141414]">
      {isStaging && <StagingBanner onExit={() => window.location.href = '/'} isOffline={dataSource === 'fallback'} />}
      
      <Header
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        isScrolled={isScrolled || searchQuery.length > 0}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        isStaging={isStaging}
        isFestivalLive={festivalConfig?.isFestivalLive}
      />

      <main className="flex-grow">
        {searchQuery ? (
          <div className="pt-24 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-6 text-white">Search Results for "{searchQuery}"</h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {searchResults.map(movie => (
                  <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No results found.</p>
            )}
          </div>
        ) : (
          <>
            {festivalConfig?.isFestivalLive ? (
              <FestivalView 
                festivalData={festivalData}
                festivalConfig={festivalConfig}
                allMovies={movies}
              />
            ) : (
              <Hero
                movies={heroMovies}
                currentIndex={heroIndex}
                onSetCurrentIndex={setHeroIndex}
                onSelectMovie={handleSelectMovie}
              />
            )}
            <div className={`px-4 md:px-12 relative z-10 ${!festivalConfig?.isFestivalLive && '-mt-16'}`}>
               {mainPageCategoryKeys.map(key => {
                 const category = categories[key];
                 if (!category || category.movieKeys.length === 0) return null;
                 const categoryMovies = category.movieKeys.map(movieKey => movies[movieKey]).filter(Boolean);
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
          </>
        )}
      </main>

      <Footer />
      <BackToTopButton />

      {selectedMovie && (
        <MovieDetailsModal
          movie={movies[selectedMovie.key] || selectedMovie} // Use updated movie from state
          isLiked={likedMovies.has(selectedMovie.key)}
          onToggleLike={toggleLikeMovie}
          onClose={handleCloseDetailsModal}
          onSelectActor={handleSelectActor}
          allMovies={movies}
          allCategories={categories}
          onSelectRecommendedMovie={handleSelectMovie}
          onSubscribe={handleSubscribe}
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
          onSubmit={handleSearchSubmit}
        />
      )}

      {showFeatureModal && <FeatureModal onClose={() => setShowFeatureModal(false)} />}
      
      <DataStatusIndicator source={dataSource} />
    </div>
  );
}

export default App;