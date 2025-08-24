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


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('introPlayed'));
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [detailsMovie, setDetailsMovie] = useState<{ movie: Movie; startWithFullMovie: boolean; openedBy: 'click' | 'hover' } | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const openModalTimeout = useRef<number | null>(null);
  const closeModalTimeout = useRef<number | null>(null);


  useEffect(() => {
    const initApp = () => {
      try {
        // Initialize likes from local storage
        const newMoviesState = { ...moviesData };
        Object.keys(newMoviesState).forEach(key => {
          const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
          if (storedLikes) {
            newMoviesState[key].likes = parseInt(storedLikes, 10);
          } else {
            // Ensure likes property exists even if not in storage
            newMoviesState[key].likes = newMoviesState[key].likes || 0;
          }
        });
        setMovies(newMoviesState);

        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }

        // Handle search query from URL
        const params = new URLSearchParams(window.location.search);
        const urlSearchQuery = params.get('search');
        if (urlSearchQuery) {
          setSearchQuery(urlSearchQuery);
        }

        // Handle intro and feature modal logic
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
  }, []);

  const visibleMovieKeys = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

    const visibleKeys = new Set<string>();
    Object.values(movies).forEach(movie => {
      if (!movie.releaseDate) {
        visibleKeys.add(movie.key);
      } else {
        // Fix for Safari date parsing: 'YYYY-MM-DD' can be unreliable.
        // Replacing hyphens with slashes makes it more compatible.
        const releaseDate = new Date(movie.releaseDate.replace(/-/g, '/'));
        if (releaseDate <= today) {
          visibleKeys.add(movie.key);
        }
      }
    });
    return visibleKeys;
  }, [movies]);


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
        likes: Math.max(0, (prevMovies[movieKey].likes || 0) + likesChange) 
      };
      localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
      return { ...prevMovies, [movieKey]: updatedMovie };
    });
  }, [likedMovies]);

  const handleSelectMovie = useCallback((movie: Movie, startWithFullMovie = false) => {
    if (openModalTimeout.current) clearTimeout(openModalTimeout.current);
    if (closeModalTimeout.current) clearTimeout(closeModalTimeout.current);
    setDetailsMovie({ movie, startWithFullMovie, openedBy: 'click' });
  }, []);
  
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsMovie(null);
  }, []);
  
  const handleOpenHoverModal = (movie: Movie) => {
    // Only open a hover modal if there isn't a click-opened modal already.
    if (!detailsMovie || detailsMovie.openedBy === 'hover') {
        setDetailsMovie({ movie, startWithFullMovie: false, openedBy: 'hover' });
    }
  };

  const handleCloseHoverModal = () => {
    if (detailsMovie?.openedBy === 'hover') {
        setDetailsMovie(null);
    }
  };

  const handleMouseEnterMovie = useCallback((movie: Movie) => {
    if (closeModalTimeout.current) clearTimeout(closeModalTimeout.current);
    if (openModalTimeout.current) clearTimeout(openModalTimeout.current);

    openModalTimeout.current = window.setTimeout(() => handleOpenHoverModal(movie), 500);
  }, [detailsMovie]);

  const handleMouseLeaveMovie = useCallback(() => {
    if (openModalTimeout.current) clearTimeout(openModalTimeout.current);
    closeModalTimeout.current = window.setTimeout(() => handleCloseHoverModal(), 300);
  }, [detailsMovie]);

  const handleMouseEnterModal = useCallback(() => {
    if (closeModalTimeout.current) clearTimeout(closeModalTimeout.current);
  }, []);

  const handleMouseLeaveModal = useCallback(() => {
    closeModalTimeout.current = window.setTimeout(() => handleCloseHoverModal(), 300);
  }, [detailsMovie]);

  const handleSelectActor = (actor: Actor) => {
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
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
    
    return allMovies
      .filter(movie => visibleMovieKeys.has(movie.key)) // Filter by visible keys
      .filter(movie => {
        const titleMatch = movie.title.toLowerCase().includes(lowercasedQuery);
        const actorMatch = movie.cast.some(actor => actor.name.toLowerCase().includes(lowercasedQuery));
        return titleMatch || actorMatch;
    });
  }, [searchQuery, movies, visibleMovieKeys]);

  const featuredMovies = useMemo(() => {
    if (!categoriesData.featured || Object.keys(movies).length === 0) return [];
    return categoriesData.featured.movieKeys
        .filter(key => visibleMovieKeys.has(key)) // Filter by visible keys
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
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 w-full h-2.5 bg-gradient-to-r from-red-500 via-blue-500 via-purple-500 via-orange-500 via-green-500 to-red-500 bg-[length:300%_100%] animate-colorChange z-50"></div>
      
      <Header searchQuery={searchQuery} onSearch={setSearchQuery} />
      
      <main className="flex-grow">
        {featuredMovies.length > 0 && <Hero 
            movies={featuredMovies} 
            currentIndex={currentHeroIndex}
            onSetCurrentIndex={handleSetCurrentHeroIndex}
            onSelectMovie={handleSelectMovie} 
            onPlayMovie={(movie) => handleSelectMovie(movie, true)} />}
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
                  onMouseEnterMovie={handleMouseEnterMovie}
                  onMouseLeaveMovie={handleMouseLeaveMovie}
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
                const categoryMovies = value.movieKeys
                    .filter(movieKey => visibleMovieKeys.has(movieKey)) // Filter by visible keys
                    .map(movieKey => movies[movieKey])
                    .filter(Boolean);
                
                if(categoryMovies.length === 0 && key === 'phillyFilmFest2025') {
                    return (
                        <div key={key} className="mb-12">
                             <h2 className="text-2xl font-bold mb-4 text-white hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap">{value.title}</h2>
                        </div>
                    )
                }
                
                if(categoryMovies.length === 0) return null;

                const sortedMovies = [...categoryMovies].sort((a, b) => b.likes - a.likes);

                return (
                  <MovieCarousel
                    key={key}
                    title={value.title}
                    movies={sortedMovies}
                    onSelectMovie={handleSelectMovie}
                    likedMovies={likedMovies}
                    onToggleLike={toggleLikeMovie}
                    onMouseEnterMovie={handleMouseEnterMovie}
                    onMouseLeaveMovie={handleMouseLeaveMovie}
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
            movie={movies[detailsMovie.movie.key] || detailsMovie.movie}
            isLiked={likedMovies.has(detailsMovie.movie.key)}
            onToggleLike={toggleLikeMovie}
            onClose={handleCloseDetailsModal}
            onSelectActor={handleSelectActor}
            startWithFullMovie={detailsMovie.startWithFullMovie}
            allMovies={movies}
            allCategories={categoriesData}
            onSelectRecommendedMovie={(movie) => handleSelectMovie(movie)}
            onMouseEnter={handleMouseEnterModal}
            onMouseLeave={handleMouseLeaveModal}
        />
      )}
      {selectedActor && (
          <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
      )}
    </div>
  );
};

export default App;