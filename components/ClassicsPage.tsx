import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { moviesData, categoriesData } from '../constants.ts';
import { Movie, Actor } from '../types.ts';
import Header from './Header.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import MovieDetailsModal from './MovieDetailsModal.tsx';
import ActorBioModal from './ActorBioModal.tsx';
import MovieCard from './MovieCard.tsx';
import StagingBanner from './StagingBanner.tsx';

const ClassicsPage: React.FC = () => {
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
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
  
    // Initialize movies with likes from local storage
    const newMoviesState = { ...moviesData };
    Object.keys(newMoviesState).forEach(key => {
      const storedLikes = localStorage.getItem(`cratetv-${key}-likes`);
      if (storedLikes) {
        newMoviesState[key].likes = parseInt(storedLikes, 10);
      }
    });
    setMovies(newMoviesState);

    // Initialize the set of liked movies
    const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
    if (storedLikedMovies) {
      setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
    }
  }, []);

  const classicFilms = useMemo(() => {
    return categoriesData.publicDomainIndie.movieKeys
      .map(key => movies[key])
      .filter(Boolean)
      .sort((a, b) => { // Sort by year
        const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
        const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }, [movies]);


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
  
  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      {isStaging && <StagingBanner onExit={exitStaging} />}
      <Header 
        searchQuery="" 
        onSearch={() => {}} 
        isScrolled={true}
        onMobileSearchClick={() => {}}
        isStaging={isStaging}
        showSearch={false}
      />
      
      <main className="flex-grow pt-24 px-4 md:px-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Classic Independent Films</h1>
            <p className="text-lg text-gray-400 mb-6">
                Explore a curated collection of influential classics that have shaped the landscape of cinema.
            </p>
             <p className="text-md text-gray-500">
              Independent films have always been the lifeblood of cinematic innovation. Free from the constraints of the studio system, these works often pushed the boundaries of storytelling, visual style, and thematic depth. The films in this collection represent pivotal moments in cinema history, from the surrealist dreamscapes of the avant-garde to the birth of the modern horror genre. They are a testament to the power of a singular vision and have left an indelible mark on filmmakers for generations.
            </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mb-16">
            {classicFilms.map(movie => (
                <MovieCard
                    key={movie.key}
                    movie={movie}
                    onSelectMovie={handleSelectMovie}
                />
            ))}
        </div>
      </main>

      <BackToTopButton />

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
    </div>
  );
};

export default ClassicsPage;