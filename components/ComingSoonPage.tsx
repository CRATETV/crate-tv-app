import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Actor, Category } from '../types';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import MovieCard from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ActorBioModal from './ActorBioModal';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const ComingSoonPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
  const [allCategories, setAllCategories] = useState<Record<string, Category>>({});
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await fetchAndCacheLiveData();
        setAllMovies(data.movies);
        setAllCategories(data.categories);
        const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
        if (storedLikedMovies) {
          setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
        }
      } catch (error) {
        console.error("Failed to load data for Coming Soon page:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const upcomingMovies = useMemo(() => {
    return Object.values(allMovies)
      .filter(movie => !isMovieReleased(movie))
      .sort((a, b) => new Date(a.releaseDateTime || 0).getTime() - new Date(b.releaseDateTime || 0).getTime());
  }, [allMovies]);

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
  
  const toggleLikeMovie = (movieKey: string) => {
    // Note: Liking on a public page might be ephemeral or could be synced
    // if a more complex anonymous user system is implemented.
    const newLikedMovies = new Set(likedMovies);
    if (newLikedMovies.has(movieKey)) {
        newLikedMovies.delete(movieKey);
    } else {
        newLikedMovies.add(movieKey);
    }
    setLikedMovies(newLikedMovies);
    try {
        localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));
    } catch (e) {
        console.warn("Could not write liked movies to localStorage.", e);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
      <main className="flex-grow pt-24 px-4 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Coming Soon to Crate TV</h1>
          {upcomingMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {upcomingMovies.map(movie => (
                <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-500">
              <h2 className="text-2xl font-bold text-gray-300">Stay Tuned!</h2>
              <p className="mt-2">There are no new releases scheduled right now. Check back soon for updates.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BackToTopButton />

      {detailsMovie && (
        <MovieDetailsModal
          movie={allMovies[detailsMovie.key] || detailsMovie}
          isLiked={likedMovies.has(detailsMovie.key)}
          onToggleLike={toggleLikeMovie}
          onClose={handleCloseDetailsModal}
          onSelectActor={handleSelectActor}
          allMovies={allMovies}
          allCategories={allCategories}
          onSelectRecommendedMovie={handleSelectMovie}
        />
      )}
      {selectedActor && <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />}
    </div>
  );
};

export default ComingSoonPage;
