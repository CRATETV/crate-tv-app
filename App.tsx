import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { moviesData, categoriesData } from './constants';
import { Movie, Actor } from './types';
import Intro from './components/Intro';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieCarousel from './components/MovieCarousel';
import Footer from './components/Footer';
import MovieDetailsModal from './components/MovieDetailsModal';
import ActorBioModal from './components/ActorBioModal';
import BackToTopButton from './components/BackToTopButton';
import LoadingSpinner from './components/LoadingSpinner';
import FeatureModal from './components/FeatureModal';

// Helper to safely update URL without crashing in sandboxed environments
const safePushState = (path: string) => {
  try {
    window.history.pushState(null, '', path);
  } catch (error) {
    console.warn("Could not update URL with pushState. This is expected in some sandboxed environments.", error);
  }
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('introPlayed'));
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [startWithFullMovie, setStartWithFullMovie] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const initApp = () => {
      const newMoviesState = { ...moviesData };
      Object.keys(newMoviesState).forEach(key => {
        const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
        if (storedLikes) {
          newMoviesState[key].likes = parseInt(storedLikes, 10);
        }
      });
      setMovies(newMoviesState);

      const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
      if (storedLikedMovies) {
        setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
      }

      const params = new URLSearchParams(window.location.search);
      const movieKey = params.get('movie');
      if (movieKey && moviesData[movieKey]) {
        handleSelectMovie(moviesData[movieKey]);
      }
      setIsLoading(false);

      const shouldShowIntro = !sessionStorage.getItem('introPlayed');
      if (!shouldShowIntro) {
        if (!localStorage.getItem('featureModalShown')) {
          setShowFeatureModal(true);
        }
      }
    };

    // Initialize the app without an artificial delay
    initApp();
  }, []);

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
        likes: Math.max(0, prevMovies[movieKey].likes + likesChange) 
      };
      localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
      return { ...prevMovies, [movieKey]: updatedMovie };
    });
  }, [likedMovies]);

  const handleSelectMovie = useCallback((movie: Movie) => {
    setStartWithFullMovie(false);
    setSelectedMovie(movie);
    safePushState(`?movie=${movie.key}`);
  }, []);
  
  const handlePlayMovie = useCallback((movie: Movie) => {
    setStartWithFullMovie(true);
    setSelectedMovie(movie);
    safePushState(`?movie=${movie.key}`);
  }, []);

  const handleSelectRecommendedMovie = useCallback((movie: Movie) => {
      closeModal(false); // Close without clearing URL
      setTimeout(() => {
          handleSelectMovie(movie);
      }, 300); // Allow time for close animation
  }, [handleSelectMovie]);

  const handleSelectActor = useCallback((actor: Actor) => {
    setSelectedActor(actor);
  }, []);

  const closeModal = (clearUrl = true) => {
    setSelectedMovie(null);
    setStartWithFullMovie(false);
    if (clearUrl) {
      safePushState(window.location.pathname);
    }
  };
  
  const closeActorModal = () => {
    setSelectedActor(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const filteredMovies = useMemo(() => {
    if (!searchQuery) return null;

    const lowercasedQuery = searchQuery.toLowerCase();
    const allMovies = Object.values(movies);
    if (allMovies.length === 0) return [];
    
    return allMovies.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(lowercasedQuery);
      const actorMatch = movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery));
      return titleMatch || actorMatch;
    });
  }, [searchQuery, movies]);

  const featuredMovies = useMemo(() => {
    if (!categoriesData.featured || Object.keys(movies).length === 0) return [];
    return categoriesData.featured.movieKeys
        .map(key => movies[key])
        .filter(Boolean);
  }, [movies]);

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
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 w-full h-2.5 bg-gradient-to-r from-red-500 via-blue-500 via-purple-500 via-orange-500 via-green-500 to-red-500 bg-[length:300%_100%] animate-[colorChange_10s_linear_infinite] z-50"></div>
      
      <Header searchQuery={searchQuery} onSearch={setSearchQuery} />
      
      <main className="flex-grow">
        {featuredMovies.length > 0 && <Hero 
            movies={featuredMovies} 
            currentIndex={currentHeroIndex}
            onSetCurrentIndex={handleSetCurrentHeroIndex}
            onSelectMovie={handleSelectMovie} 
            onPlayMovie={handlePlayMovie} />}
        <div className="relative px-4 md:px-12 pb-8 -mt-16 md:-mt-24 pt-8">
          {filteredMovies ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Search Results for "{searchQuery}"</h2>
                <button 
                  onClick={handleClearSearch} 
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear Search
                </button>
              </div>
              {filteredMovies.length > 0 ? (
                <MovieCarousel
                  key="search-results"
                  title=""
                  movies={filteredMovies}
                  onSelectMovie={handleSelectMovie}
                  likedMovies={likedMovies}
                  onToggleLike={toggleLikeMovie}
                />
              ) : (
                <div className="text-center py-16 px-4">
                  <h3 className="text-2xl font-bold text-white">No results found for "{searchQuery}"</h3>
                  <p className="text-gray-400 mt-2">Try searching for another movie or actor.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {Object.entries(categoriesData).map(([key, value]) => {
                const categoryMovies = value.movieKeys.map(movieKey => movies[movieKey]).filter(Boolean);
                const sortedMovies = [...categoryMovies].sort((a, b) => b.likes - a.likes);

                return (
                  <MovieCarousel
                    key={key}
                    title={value.title}
                    movies={sortedMovies}
                    onSelectMovie={handleSelectMovie}
                    likedMovies={likedMovies}
                    onToggleLike={toggleLikeMovie}
                  />
                );
              })}
            </>
          )}
        </div>
      </main>

      <Footer />
      <BackToTopButton />

      {selectedMovie && (
        <MovieDetailsModal 
          movie={selectedMovie} 
          onClose={closeModal} 
          onSelectActor={handleSelectActor}
          startWithFullMovie={startWithFullMovie}
          allMovies={movies}
          allCategories={categoriesData}
          onSelectRecommendedMovie={handleSelectRecommendedMovie}
        />
      )}
      {selectedActor && (
        <ActorBioModal
          actor={selectedActor}
          onClose={closeActorModal}
        />
      )}
      {showFeatureModal && <FeatureModal onClose={handleCloseFeatureModal} />}
    </div>
  );
};

export default App;