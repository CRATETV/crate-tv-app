

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
// FIX: Corrected import to use type definitions from types.ts
import { Movie, Actor, FilmBlock, FestivalConfig, Category, FestivalDay } from './types.ts';
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
import FilmBlockCard from './components/FilmBlockCard.tsx';
import FilmBlockDetailsModal from './components/FilmBlockDetailsModal.tsx';

// FIX: Added and exported the PaymentItem interface so it can be used by other components like the payment modal.
export interface PaymentItem {
  id: string;
  type: 'block' | 'film' | 'pass';
  name: string;
  price: number;
}

// Utility function to preload images in the background
const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
};

interface FestivalPurchases {
  hasFullPass: boolean;
  purchasedBlocks: string[];
  purchasedFilms: string[];
}

// Helper function to determine if a movie should be visible on the main page.
const isMovieVisible = (movie: Movie) => {
    const now = new Date();
    const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
    const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;

    const isReleased = !releaseDate || releaseDate <= now;
    const isNotExpired = !expiryDate || expiryDate > now;

    return isReleased && isNotExpired;
};


const useFestivalPurchases = () => {
  const [purchases, setPurchases] = useState<FestivalPurchases>({
    hasFullPass: false,
    purchasedBlocks: [],
    purchasedFilms: [],
  });

  useEffect(() => {
    try {
      const storedPurchases = localStorage.getItem('crateTvFestivalPurchases');
      if (storedPurchases) {
        setPurchases(JSON.parse(storedPurchases));
      }
    } catch (error) {
      console.error("Failed to load festival purchases from localStorage", error);
    }
  }, []);

  const updatePurchases = (newPurchases: FestivalPurchases) => {
    setPurchases(newPurchases);
    localStorage.setItem('crateTvFestivalPurchases', JSON.stringify(newPurchases));
  };

  const purchaseFullPass = () => {
    updatePurchases({ ...purchases, hasFullPass: true });
  };

  const purchaseBlock = (blockId: string) => {
    if (purchases.purchasedBlocks.includes(blockId)) return;
    updatePurchases({
      ...purchases,
      purchasedBlocks: [...purchases.purchasedBlocks, blockId],
    });
  };
  
  const purchaseFilm = (filmKey: string) => {
    if (purchases.purchasedFilms.includes(filmKey)) return;
    updatePurchases({
      ...purchases,
      purchasedFilms: [...purchases.purchasedFilms, filmKey],
    });
  };

  const isFilmUnlocked = (filmKey: string, blockId: string) => {
    return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId) || purchases.purchasedFilms.includes(filmKey);
  };
  
  const isBlockUnlocked = (blockId: string) => {
     return purchases.hasFullPass || purchases.purchasedBlocks.includes(blockId);
  }

  return { purchases, purchaseFullPass, purchaseBlock, purchaseFilm, isFilmUnlocked, isBlockUnlocked };
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
  
  // Feature Toggles
  const [isFestivalLive, setIsFestivalLive] = useState(false);


  // Festival State
  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<FilmBlock | null>(null);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });
  const [festivalDays, setFestivalDays] = useState<FestivalDay[]>([]);
  const { purchases, isFilmUnlocked, isBlockUnlocked } = useFestivalPurchases();
  
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
    // Check feature toggles
    const festivalStatus = localStorage.getItem('crateTv_isFestivalLive');
    if (festivalStatus === 'true') setIsFestivalLive(true);
    
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
        const liveData = await fetchAndCacheLiveData();
        
        setCategories(liveData.categories);
        setFestivalConfig(liveData.festivalConfig);
        setFestivalDays(liveData.festivalData);

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

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      {isStaging && <StagingBanner onExit={exitStaging} />}
      <Header 
        searchQuery={searchQuery} 
        onSearch={setSearchQuery} 
        isScrolled={isScrolled}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        isStaging={isStaging}
      />
      
      <main className="flex-grow overflow-x-hidden">
        {searchQuery.length === 0 && featuredMovies.length > 0 && <Hero 
            movies={featuredMovies} 
            currentIndex={currentHeroIndex}
            onSetCurrentIndex={handleSetCurrentHeroIndex}
            onSelectMovie={handleSelectMovie} 
            />}

        <div className={`relative px-4 md:px-12 pb-8 ${searchQuery.length > 0 ? 'pt-24' : '-mt-8 md:-mt-24'}`}>
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
              {isFestivalLive && (
                <>
                  {/* --- Film Festival Section --- */}
                  <div id="festival" className="max-w-7xl mx-auto my-16 border-t border-b border-gray-800 py-12">
                      <div className="relative py-16 md:py-20 bg-gray-900 text-center rounded-lg overflow-hidden mb-12">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-red-900/40 to-black"></div>
                          <div className="relative z-10 max-w-4xl mx-auto px-4">
                              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{festivalConfig.title}</h2>
                              <p className="text-md md:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
                                  {festivalConfig.description}
                              </p>
                              {!purchases.hasFullPass ? (
                                  <div className="bg-gray-800/50 border border-gray-700 text-gray-400 font-bold py-3 px-6 rounded-lg text-lg inline-block cursor-not-allowed">
                                      Payments Are Currently Unavailable
                                  </div>
                              ) : (
                                  <div className="bg-green-500/20 border border-green-400 text-green-300 font-bold py-3 px-6 rounded-lg text-lg inline-block">
                                      ✓ Festival Pass Unlocked
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="flex justify-center border-b border-gray-700 mb-8 overflow-x-auto scrollbar-hide">
                          {festivalDays.map(day => (
                              <button
                                  key={day.day}
                                  onClick={() => setActiveDay(day.day)}
                                  className={`flex-shrink-0 px-4 sm:px-8 py-3 text-md font-semibold transition-colors duration-300 border-b-4 ${activeDay === day.day ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                              >
                                  Day {day.day} <span className="hidden sm:inline-block text-sm text-gray-500">- {day.date}</span>
                              </button>
                          ))}
                      </div>

                      <div>
                          {festivalDays.filter(day => day.day === activeDay).map(day => (
                              <div key={day.day} className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
                                  {day.blocks.map(block => {
                                      const blockMovies = block.movieKeys.map(key => movies[key]).filter(Boolean);
                                      return (
                                          <div key={block.id}>
                                               <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">{block.title}</h3>
                                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                  {blockMovies.map(movie => (
                                                      <FilmBlockCard 
                                                          key={movie.key}
                                                          movie={movie}
                                                          isUnlocked={isFilmUnlocked(movie.key, block.id)}
                                                          onWatch={() => handleNavigateToMovie(movie.key)}
                                                          onUnlock={() => setSelectedBlock(block)}
                                                      />
                                                  ))}
                                              </div>
                                              <div className="mt-4 text-center">
                                                  {isBlockUnlocked(block.id) ? (
                                                       <span className="text-green-400 font-semibold">✓ You have access to this block</span>
                                                  ) : (
                                                      <div className="bg-gray-700 text-gray-400 font-bold py-2 px-6 rounded-lg inline-block cursor-not-allowed">
                                                          Unlock Full Block
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          ))}
                      </div>
                  </div>
                  {/* --- End Film Festival Section --- */}
                </>
              )}

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
      {/* Festival Modals */}
       {selectedBlock && (
        <FilmBlockDetailsModal 
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            isFilmUnlocked={isFilmUnlocked}
            isBlockUnlocked={isBlockUnlocked}
            onWatchMovie={handleNavigateToMovie}
            allMovies={movies}
        />
      )}
    </div>
  );
};

export default App;