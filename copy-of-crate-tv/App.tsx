import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIX: Imported `invalidateCache` to be used in the live update handler.
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import { Movie, Actor, Category, FestivalDay, FestivalConfig } from './types.ts';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import MovieCarousel from './components/MovieCarousel.tsx';
import Footer from './components/Footer.tsx';
import BackToTopButton from './components/BackToTopButton.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import FeatureModal from './components/FeatureModal.tsx';
import MovieDetailsModal from './components/MovieDetailsModal.tsx';
import ActorBioModal from './components/ActorBioModal.tsx';
import MovieCard from './components/MovieCard.tsx';
import SearchOverlay from './components/SearchOverlay.tsx';
import StagingBanner from './components/StagingBanner.tsx';
import DataStatusIndicator from './components/DataStatusIndicator.tsx';
import FestivalView from './components/FestivalView.tsx';

// Utility function to preload images in the background
const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
};

// Helper function to determine if a movie should be visible on the main page.
const isMovieVisible = (movie: Movie) => {
    const now = new Date();
    const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
    const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;

    const isReleased = !releaseDate || releaseDate <= now;
    const isNotExpired = !expiryDate || expiryDate > now;

    return isReleased && isNotExpired;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [recommendedKeys, setRecommendedKeys] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [isFestivalLive, setIsFestivalLive] = useState(false);
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });
  
  // Create a memoized map of movie keys to their genre titles for efficient searching.
  const movieToGenresMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const movieKey in movies) {
        const movieGenres: string[] = [];
        for (const category of Object.values(categories)) {
            if (category.movieKeys.includes(movieKey)) {
                movieGenres.push(category.title.toLowerCase());
            }
        }
        map.set(movieKey, movieGenres);
    }
    return map;
  }, [movies, categories]);


  useEffect(() => {
    // Check for staging environment
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const isStagingActive = env === 'staging' || sessionStorage.getItem('crateTvStaging') === 'true';

    if (isStagingActive) {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
    }

    const initApp = async () => {
      try {
        const { data: liveData, source } = await fetchAndCacheLiveData();
        setDataSource(source);
        
        setCategories(liveData.categories);
        setFestivalData(liveData.festivalData);
        setFestivalConfig(liveData.festivalConfig);
        setIsFestivalLive(liveData.festivalConfig?.isFestivalLive ?? false);

        // Initialize likes from local storage and merge with fetched data
        const newMoviesState = { ...liveData.movies };
        Object.keys(newMoviesState).forEach(key => {
          const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
          if (storedLikes) {
            newMoviesState[key].likes = parseInt(storedLikes, 10);
          } else {
            newMoviesState[key].likes = newMoviesState[key].likes || 0;
          }
        });
        setMovies(newMoviesState);

        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }

        // Handle search query from URL
        const urlSearchQuery = params.get('search');
        if (urlSearchQuery) {
          setSearchQuery(urlSearchQuery);
        }

        // Show feature modal only if intro has already been played
        const introHasPlayed = sessionStorage.getItem('introPlayed');
        if (introHasPlayed) {
          if (!localStorage.getItem('featureModalShown')) {
            setShowFeatureModal(true);
          }
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Handle scrolling to hash anchor on initial load
    if (window.location.hash) {
        const elementId = window.location.hash.slice(1);
        const element = document.getElementById(elementId);
        if (element) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }
    
    // Live update listener
    const updateChannel = new BroadcastChannel('cratetv_data_update');
    const handleUpdate = () => {
        console.log('Received data update signal. Refetching live data...');
        invalidateCache();
        initApp();
    };
    updateChannel.addEventListener('message', handleUpdate);

    return () => {
        window.removeEventListener('scroll', handleScroll);
        updateChannel.removeEventListener('message', handleUpdate);
        updateChannel.close();
    };
  }, []);

  // Fetch AI recommendations when liked movies change
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (likedMovies.size < 3) {
        setRecommendedKeys([]); // Not enough data for recommendations
        return;
      }
      setIsLoadingRecommendations(true);

      try {
        // Cache recommendations in session storage to avoid repeated API calls
        const likedMoviesArray = Array.from(likedMovies);
        const cacheKey = `recommendations-${likedMoviesArray.sort().join(',')}`;
        const cachedRecs = sessionStorage.getItem(cacheKey);

        if (cachedRecs) {
          setRecommendedKeys(JSON.parse(cachedRecs));
        } else {
          const likedTitles = likedMoviesArray.map(key => movies[key]?.title).filter(Boolean);
          const allMoviesForApi = Object.entries(movies).reduce((acc, [key, movie]) => {
              acc[key] = movie.title;
              return acc;
          }, {} as Record<string, string>);

          const response = await fetch('/api/generate-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ likedTitles, allMovies: allMoviesForApi }),
          });

          if (!response.ok) throw new Error('Failed to fetch recommendations');
          
          const { recommendedKeys: keys } = await response.json();
          setRecommendedKeys(keys || []);
          sessionStorage.setItem(cacheKey, JSON.stringify(keys || []));
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    if (Object.keys(movies).length > 0) {
        fetchRecommendations();
    }
  }, [likedMovies, movies]);

  // Preload critical images while the app is initializing
  useEffect(() => {
    if (isLoading || Object.keys(movies).length === 0) return;

    const imagesToPreload: string[] = [];
    
    // Get all featured movie posters
    const featuredKeys = categories.featured?.movieKeys || [];
    featuredKeys.forEach(key => {
      const movie = movies[key];
      if (movie?.poster) {
        imagesToPreload.push(movie.poster);
      }
    });

    // Get the first poster from other main categories
    Object.entries(categories).forEach(([key, category]) => {
      if (key !== 'featured' && category.movieKeys.length > 0) {
        const firstMovieKey = category.movieKeys[0];
        const movie = movies[firstMovieKey];
        if (movie?.poster) {
          imagesToPreload.push(movie.poster);
        }
      }
    });

    preloadImages(Array.from(new Set(imagesToPreload))); // Use Set to avoid duplicates
  }, [movies, categories, isLoading]);

  const handleCloseFeatureModal = () => {
    setShowFeatureModal(false);
    localStorage.setItem('featureModalShown', 'true');
  };

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

  const handleSelectMovie = useCallback((movie: Movie) => {
    setDetailsMovie(movie);
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  const handleSelectActor = (actor: Actor) => {
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
    setSelectedActor(null);
  };

  const handleSearchSubmit = (query: string) => {
      if (query) {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
      } else {
        window.history.pushState({}, '', window.location.pathname);
      }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    window.history.pushState({}, '', window.location.pathname);
  };
  
  const handleNavigateToMovie = (movieKey: string) => {
    window.history.pushState({}, '', `/movie/${movieKey}?play=true`);
    window.dispatchEvent(new Event('pushstate'));
  };

  const filteredMovies = useMemo(() => {
    if (!searchQuery) return null;

    const lowercasedQuery = searchQuery.toLowerCase();
    const allMovies = Object.values(movies).filter(isMovieVisible);
    if (allMovies.length === 0) return [];
    
    return allMovies
      .filter(movie => {
        const titleMatch = movie.title.toLowerCase().includes(lowercasedQuery);
        const actorMatch = movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery));
        
        const movieGenres = movieToGenresMap.get(movie.key) || [];
        const genreMatch = movieGenres.some(genre => genre.includes(lowercasedQuery));

        return titleMatch || actorMatch || genreMatch;
    });
  }, [searchQuery, movies, movieToGenresMap]);

  const featuredMovies = useMemo(() => {
    if (!categories.featured || Object.keys(movies).length === 0) return [];
    return categories.featured.movieKeys
        .map(key => movies[key])
        .filter(Boolean)
        .filter(isMovieVisible);
  }, [movies, categories]);

  useEffect(() => {
    if (featuredMovies.length > 1) {
        const timer = setInterval(() => {
            setCurrentHeroIndex(prevIndex => (prevIndex + 1) % featuredMovies.length);
        }, 7000);
        return () => clearInterval(timer);
    }
  }, [featuredMovies.length]);

  const handleSetCurrentHeroIndex = useCallback((index: number) => {
      setCurrentHeroIndex(index);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const recommendedMoviesList = recommendedKeys
      .map(key => movies[key])
      .filter(Boolean)
      .filter(isMovieVisible);
  
  const isOffline = dataSource === 'fallback';

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      <DataStatusIndicator source={dataSource} />
      {isStaging && <StagingBanner onExit={exitStaging} isOffline={isOffline} />}
      <Header 
        searchQuery={searchQuery} 
        onSearch={setSearchQuery} 
        isScrolled={isScrolled}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        isStaging={isStaging}
        isOffline={isOffline}
      />
      
      <main className="flex-grow overflow-x-hidden">
        {isFestivalLive && searchQuery.length === 0 ? (
          <div className="pt-16">
            <FestivalView 
              festivalData={festivalData}
              festivalConfig={festivalConfig}
              allMovies={movies}
            />
          </div>
        ) : (
           searchQuery.length === 0 && featuredMovies.length > 0 && <Hero 
              movies={featuredMovies} 
              currentIndex={currentHeroIndex}
              onSetCurrentIndex={handleSetCurrentHeroIndex}
              onSelectMovie={handleSelectMovie} 
            />
        )}

        <div className={`relative px-4 md:px-12 pb-8 ${isFestivalLive && searchQuery.length === 0 ? 'pt-8' : (searchQuery.length > 0 ? 'pt-24' : '-mt-8 md:-mt-24')}`}>
          {filteredMovies ? (
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                    <span className="text-gray-400">Results for: </span>{searchQuery}
                </h2>
                <button 
                  onClick={handleClearSearch} 
                  className="text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              {filteredMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                  {filteredMovies.map(movie => (
                    <MovieCard
                      key={movie.key}
                      movie={movie}
                      onSelectMovie={handleSelectMovie}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <h3 className="text-2xl font-bold text-white">No results found for "{searchQuery}"</h3>
                  <p className="text-gray-400 mt-2">Try searching for another movie, actor, or genre.</p>
                </div>
              )}
            </div>
          ) : (
            <>
               {Object.entries(categories)
                .filter(([key]) => key === 'newReleases')
                .map(([key, value]) => {
                  const categoryMovies = value.movieKeys
                      .map(movieKey => movies[movieKey])
                      .filter(Boolean)
                      .filter(isMovieVisible);
                  if(categoryMovies.length === 0) return null;
                  return (
                    <MovieCarousel
                      key={key}
                      title={value.title}
                      movies={categoryMovies}
                      onSelectMovie={handleSelectMovie}
                      hideTitleOnMobile={true}
                    />
                  );
              })}

              {recommendedMoviesList.length > 0 && (
                <MovieCarousel
                  key="recommendations"
                  title="✨ Picks For You"
                  movies={recommendedMoviesList}
                  onSelectMovie={handleSelectMovie}
                />
              )}
              
              {Object.entries(categories)
                .filter(([key]) => key !== 'featured' && key !== 'publicDomainIndie' && key !== 'newReleases' && key !== 'premium')
                .map(([key, value]) => {
                  const categoryMovies = value.movieKeys
                      .map(movieKey => movies[movieKey])
                      .filter(Boolean)
                      .filter(isMovieVisible);

                  if(categoryMovies.length === 0) return null;

                  const sortedMovies = [...categoryMovies].sort((a, b) => b.likes - a.likes);

                  return (
                    <MovieCarousel
                      key={key}
                      title={value.title}
                      movies={sortedMovies}
                      onSelectMovie={handleSelectMovie}
                    />
                  );
              })}
            </>
          )}
        </div>
      </main>

      <Footer />
      <BackToTopButton />

      {showFeatureModal && <FeatureModal onClose={handleCloseFeatureModal} />}
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
          onSubmit={(query) => {
            handleSearchSubmit(query);
            setIsMobileSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default App;