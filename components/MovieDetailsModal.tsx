import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types.ts';
import DirectorCreditsModal from './DirectorCreditsModal.tsx';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: () => void;
  onSelectActor: (actor: Actor) => void;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
}

type PlayerMode = 'poster' | 'trailer' | 'full';

const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void; }> = ({ movie, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
        <div
            className="group relative cursor-pointer rounded-md overflow-hidden aspect-[3/4] bg-gray-800"
            onClick={() => onClick(movie)}
        >
            {/* Skeleton Loader */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-700 animate-pulse-bg"></div>
            )}
            <img
                src={movie.poster}
                alt={movie.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
};


const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ 
  movie, 
  isLiked,
  onToggleLike,
  onClose, 
  onSelectActor, 
  allMovies,
  allCategories,
  onSelectRecommendedMovie
}) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [isPosterLoaded, setIsPosterLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset modal state when the movie prop changes
  useEffect(() => {
    setPlayerMode('poster');
    setIsPosterLoaded(false);
    // Scroll to the top of the modal content when a new movie is selected
    if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
    }
    // Update URL to reflect the currently viewed movie
    if (window.history.replaceState) {
        const path = `/movie/${movie.key}${window.location.search}`;
        window.history.replaceState({ path }, '', path);
    }
  }, [movie]);
  
  // Close modal with Escape key and handle body scroll
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAndResetUrl();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Effect for like animation
  useEffect(() => {
    // Clear any existing timers
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (isLiked) {
        setIsAnimatingLike(true);
        const timer = setTimeout(() => setIsAnimatingLike(false), 500);
        timers.current.push(timer);
    }

    return () => {
        timers.current.forEach(clearTimeout);
    };
  }, [isLiked, movie.key]);


  // Autoplay video when mode changes
  useEffect(() => {
    if ((playerMode === 'trailer' || playerMode === 'full') && videoRef.current) {
      videoRef.current.play().catch(err => console.warn("Autoplay was prevented:", err));
    }
  }, [playerMode]);

  const closeAndResetUrl = () => {
    if (window.history.replaceState) {
      const path = `/${window.location.search}`;
      window.history.replaceState({ path }, '', path);
    }
    onClose();
  };

  const handleToggleLike = () => {
    onToggleLike(movie.key);
  };
  
  const handleSelectMovieFromDirector = (selectedMovie: Movie) => {
    setSelectedDirector(null);
    onSelectRecommendedMovie(selectedMovie);
  };

  const videoSource = playerMode === 'trailer' ? movie.trailer : movie.fullMovie;

  const recommendedMovies = useMemo(() => {
    if (!movie) return [];
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(allCategories).filter(cat => cat.movieKeys.includes(movie.key));
    
    currentMovieCategories.forEach(cat => {
      cat.movieKeys.forEach(key => {
        if (key !== movie.key) {
          recommendedKeys.add(key);
        }
      });
    });

    return Array.from(recommendedKeys)
      .map(key => allMovies[key])
      .filter(Boolean) // Filter out any movies that might not exist in allMovies
      .slice(0, 7); // Limit to 7 recommendations
  }, [movie, allMovies, allCategories]);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  }

  const handlePlayMovie = (type: 'trailer' | 'full') => {
      if (type === 'full') {
          onClose(); // Close the modal
          handleNavigate(`/movie/${movie.key}?play=true`); // Navigate to the dedicated page and play
      } else {
          setPlayerMode(type);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]" onClick={closeAndResetUrl}>
      <div 
        className="bg-[#181818] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-hide border border-gray-800"
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
      >
        <button onClick={closeAndResetUrl} className="absolute top-3 right-3 text-gray-400 bg-black/50 rounded-full p-1.5 hover:text-white z-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-full aspect-video bg-black">
          {playerMode === 'poster' ? (
            <div className="relative w-full h-full">
              {/* Skeleton Loader */}
              {!isPosterLoaded && (
                <div className="absolute inset-0 bg-gray-700 animate-pulse-bg"></div>
              )}
              <img
                src={movie.poster}
                alt={movie.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isPosterLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsPosterLoaded(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
            </div>
          ) : (
            <video
              ref={videoRef}
              key={videoSource}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted={false} // User initiated play, so unmute
              playsInline
            >
              <source src={videoSource} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}

          <div className="absolute bottom-6 left-6 text-white z-10">
            <h2 className="text-2xl md:text-4xl font-bold drop-shadow-lg mb-4">{movie.title}</h2>
            <div className="flex flex-wrap items-center gap-3">
              {movie.fullMovie && (
                <button onClick={() => handlePlayMovie('full')} className="flex items-center justify-center px-4 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Play Full Movie
                </button>
              )}
              {movie.trailer && (
                <button onClick={() => handlePlayMovie('trailer')} className="flex items-center justify-center px-4 py-2 bg-gray-500/60 text-white font-bold rounded-md hover:bg-gray-500/40 transition-colors">
                  Play Trailer
                </button>
              )}
              <button onClick={handleToggleLike} className={`h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="text-gray-300 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
              <div className="mt-6 bg-gradient-to-r from-red-500/10 to-blue-500/10 p-3 rounded-lg text-center border border-gray-700">
                <p className="text-sm text-white">✨ Click an actor's name for their bio & an AI-generated fun fact!</p>
              </div>
            </div>
            <div className="text-sm">
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Cast</h3>
              <div className="space-y-2 text-white">
                {movie.cast.map((actor) => (
                  <p key={actor.name} className="group cursor-pointer" onClick={() => onSelectActor(actor)}>
                    <span className="group-hover:text-red-400 transition">{actor.name}</span>
                  </p>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2">Director</h3>
              <div className="space-y-2 text-white">
                  {movie.director.split(',').map(name => name.trim()).filter(Boolean).map(directorName => (
                      <p key={directorName} className="group cursor-pointer" onClick={() => setSelectedDirector(directorName)}>
                          <span className="group-hover:text-red-400 transition">{directorName}</span>
                      </p>
                  ))}
              </div>
            </div>
          </div>

          {recommendedMovies.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-2xl font-bold mb-4">More Like This</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
                {recommendedMovies.map(recMovie => (
                  <RecommendedMovieCard key={recMovie.key} movie={recMovie} onClick={onSelectRecommendedMovie} />
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedDirector && (
            <DirectorCreditsModal
                directorName={selectedDirector}
                onClose={() => setSelectedDirector(null)}
                allMovies={allMovies}
                onSelectMovie={handleSelectMovieFromDirector}
            />
        )}
      </div>
    </div>
  );
};

export default MovieDetailsModal;