import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import { Movie, Actor, Category, FestivalConfig } from './types.ts';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import MovieCarousel from './components/MovieCarousel.tsx';
import Footer from './components/Footer.tsx';
import BackToTopButton from './components/BackToTopButton.tsx';
import MovieDetailsModal from './components/MovieDetailsModal.tsx';
import ActorBioModal from './components/ActorBioModal.tsx';
import SearchOverlay from './components/SearchOverlay.tsx';
import StagingBanner from './components/StagingBanner.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import FeatureModal from './components/FeatureModal.tsx';
import DataStatusIndicator from './components/DataStatusIndicator.tsx';
import RokuBanner from './components/RokuBanner.tsx';
// FIX: Imported the MovieCard component to resolve the 'Cannot find name' error.
import MovieCard from './components/MovieCard.tsx';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  // Effect to run on initial component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const isStagingActive = env === 'staging' || sessionStorage.getItem('crateTvStaging') === 'true';

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
      invalidateCache();
    }
    
    // Feature modal logic
    const hasSeenModal = localStorage.getItem('hasSeenActorBioFeature');
    if (!hasSeenModal) {
      setShowFeatureModal(true);
      localStorage.setItem('hasSeenActorBioFeature', 'true');
    }

    const loadData = async () => {
      try {
        const { data: liveData, source } = await fetchAndCacheLiveData();
        setDataSource(source);
        
        const now = new Date();
        const visibleMovies: Record<string, Movie> = {};
        Object.values(liveData.movies).forEach(movie => {
          const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
          const isNotExpired = !expiryDate || expiryDate > now;
          if (isNotExpired) {
            visibleMovies[movie.key] = movie;
          }
        });
        
        const newMoviesState = { ...visibleMovies };
        Object.keys(newMoviesState).forEach((key) => {
          const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
          if (storedLikes) {
            newMoviesState[key].likes = parseInt(storedLikes, 10);
          } else {
            newMoviesState[key].likes = newMoviesState[key].likes || 0;
          }
        });

        setMovies(newMoviesState);
        setCategories(liveData.categories);
        setFestivalConfig(liveData.festivalConfig);

        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();

    // Handle search from URL on load
    const searchFromUrl = params.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
  }, []);
  
  // Hero slider logic
  const featuredMovies = useMemo(() => {
    const featuredCategory = categories['featured'];
    if (!featuredCategory || !featuredCategory.movieKeys) return [];
    return featuredCategory.movieKeys.map(key => movies[key]).filter(Boolean);
  }, [categories, movies]);

  useEffect(() => {
    if (featuredMovies.length > 0) {
      const interval = setInterval(() => {
        setHeroIndex(prevIndex => (prevIndex + 1) % featuredMovies.length);
      }, 7000); // Change hero every 7 seconds
      return () => clearInterval(interval);
    }
  }, [featuredMovies.length]);

  const handleSelectMovie = useCallback((movie: Movie) => {
    setDetailsMovie(movie);
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  const handleSelectActor = useCallback((actor: Actor) => {
    setDetailsMovie(null); // Close movie modal
    // Delay opening actor modal to allow for transition
    setTimeout(() => setSelectedActor(actor), 300);
  }, []);
  
  const handleCloseActorModal = useCallback(() => {
    setSelectedActor(null);
  }, []);
  
  const exitStaging = () => {
    sessionStorage.removeItem('crateTvStaging');
    const params = new URLSearchParams(window.location.search);
    params.delete('env');
    window.location.search = params.toString();
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
    
    setMovies(prevMovies => {
      const updatedMovie = { 
        ...prevMovies[movieKey], 
        likes: Math.max(0, (prevMovies[movieKey].likes || 0) + likesChange) 
      };
      localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
      return { ...prevMovies, [movieKey]: updatedMovie };
    });
  }, [likedMovies]);

  // Filter movies based on search query
  const searchedMovies = useMemo(() => {
    if (!searchQuery) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    return Object.values(movies).filter(movie =>
      movie.title.toLowerCase().includes(lowercasedQuery) ||
      movie.director.toLowerCase().includes(lowercasedQuery) ||
      movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, movies]);

  // Scroll position for header transparency
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (query: string) => {
    // This function is for handling direct search submissions, e.g., from header.
    // The main app just filters based on the query state.
    // If we wanted a dedicated search page, we'd navigate here.
    setIsMobileSearchOpen(false); // Close mobile overlay on submit
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  const categoryOrder = [
    'newReleases',
    'awardWinners',
    'pwff12thAnnual',
    'comedy',
    'drama',
    'documentary',
    'exploreTitles',
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#141414]">
      {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
      <DataStatusIndicator source={dataSource} />
      
      <Header 
        searchQuery={searchQuery} 
        onSearch={setSearchQuery} 
        isScrolled={isScrolled}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        isStaging={isStaging}
        isOffline={dataSource === 'fallback'}
        isFestivalLive={festivalConfig?.isFestivalLive}
      />

      <main className="flex-grow">
        {searchQuery ? (
          <div className="pt-24 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-4">Search Results for "{searchQuery}"</h2>
            {searchedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchedMovies.map(movie => (
                  <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No movies found.</p>
            )}
          </div>
        ) : (
          <>
            <Hero 
              movies={featuredMovies}
              currentIndex={heroIndex}
              onSetCurrentIndex={setHeroIndex}
              onSelectMovie={handleSelectMovie}
            />
            <div className="px-4 md:px-12 -mt-16 relative z-10">
              <RokuBanner />
              {categoryOrder.map(key => {
                const category = categories[key];
                if (!category) return null;
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

      {detailsMovie && (
        <MovieDetailsModal
          movie={movies[detailsMovie.key] || detailsMovie}
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
          onSubmit={handleSearchSubmit}
        />
      )}
      {showFeatureModal && (
        <FeatureModal onClose={() => setShowFeatureModal(false)} />
      )}
    </div>
  );
};

export default App;
