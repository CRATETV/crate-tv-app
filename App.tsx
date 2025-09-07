import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { categoriesData, moviesData } from './constants.ts';
import { Movie, Actor } from './types.ts';
import Intro from './components/Intro.tsx';
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

// Pre-compute a map of movie keys to their genre titles for efficient searching.
const movieToGenresMap = new Map<string, string[]>();
for (const movieKey in moviesData) {
    const movieGenres: string[] = [];
    for (const category of Object.values(categoriesData)) {
        if (category.movieKeys.includes(movieKey)) {
            movieGenres.push(category.title.toLowerCase());
        }
    }
    movieToGenresMap.set(movieKey, movieGenres);
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


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('introPlayed'));
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    // Check for staging environment
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    if (env === 'staging') {
      sessionStorage.setItem('crateTvStaging', 'true');
      setIsStaging(true);
    } else if (sessionStorage.getItem('crateTvStaging') === 'true') {
      setIsStaging(true);
    }

    const initApp = () => {
      try {
        // Initialize likes from local storage
        const newMoviesState = { ...moviesData };
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

        const shouldShowIntro = !sessionStorage.getItem('introPlayed');
        if (!shouldShowIntro) {
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Preload critical images while the intro is playing
  useEffect(() => {
    if (showIntro) {
      const imagesToPreload: string[] = [];

      // Get all featured movie posters
      const featuredKeys = categoriesData.featured?.movieKeys || [];
      featuredKeys.forEach(key => {
        const movie = moviesData[key];
        if (movie?.poster) {
          imagesToPreload.push(movie.poster);
        }
      });

      // Get the first poster from other main categories
      Object.entries(categoriesData).forEach(([key, category]) => {
        if (key !== 'featured' && category.movieKeys.length > 0) {
          const firstMovieKey = category.movieKeys[0];
          const movie = moviesData[firstMovieKey];
          if (movie?.poster) {
            imagesToPreload.push(movie.poster);
          }
        }
      });

      preloadImages(Array.from(new Set(imagesToPreload))); // Use Set to avoid duplicates
    }
  }, [showIntro]);

  const visibleMovieKeys = useMemo(() => {
    if (isStaging) {
        // In staging, all movies are visible
        return new Set<string>(Object.keys(movies));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visibleKeys = new Set<string>();
    Object.values(movies).forEach(movie => {
      if (!movie.releaseDate) {
        visibleKeys.add(movie.key);
      } else {
        const releaseDate = new Date(movie.releaseDate.replace(/-/g, '/'));
        if (releaseDate <= today) {
          visibleKeys.add(movie.key);
        }
      }
    });
    return visibleKeys;
  }, [movies, isStaging]);


  const handleIntroEnd = () => {
    sessionStorage.setItem('introPlayed', 'true');
    setShowIntro(false);

    if (!localStorage.getItem('featureModalShown')) {
      setShowFeatureModal(true);
    }
  };

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

  const filteredMovies = useMemo(() => {
    if (!searchQuery) return null;

    const lowercasedQuery = searchQuery.toLowerCase();
    const allMovies = Object.values(movies);
    if (allMovies.length === 0) return [];
    
    return allMovies
      .filter(movie => visibleMovieKeys.has(movie.key))
      .filter(movie => {
        const titleMatch = movie.title.toLowerCase().includes(lowercasedQuery);
        const actorMatch = movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery));
        
        const movieGenres = movieToGenresMap.get(movie.key) || [];
        const genreMatch = movieGenres.some(genre => genre.includes(lowercasedQuery));

        return titleMatch || actorMatch || genreMatch;
    });
  }, [searchQuery, movies, visibleMovieKeys]);

  const featuredMovies = useMemo(() => {
    if (!categoriesData.featured || Object.keys(movies).length === 0) return [];
    return categoriesData.featured.movieKeys
        .filter(key => visibleMovieKeys.has(key))
        .map(key => movies[key])
        .filter(Boolean);
  }, [movies, visibleMovieKeys]);

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
  
  if (showIntro) {
    return <Intro onIntroEnd={handleIntroEnd} />;
  }
  
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
            onSelectMovie={handleSelectMovie} />}

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
              {Object.entries(categoriesData).filter(([key]) => key !== 'featured' && key !== 'publicDomainIndie').map(([key, value]) => {
                const categoryMovies = value.movieKeys
                    .filter(movieKey => visibleMovieKeys.has(movieKey))
                    .map(movieKey => movies[movieKey])
                    .filter(Boolean);
                
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
            allCategories={categoriesData}
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