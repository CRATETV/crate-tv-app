import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import SquarePaymentModal from './SquarePaymentModal';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: () => void;
  onSelectActor: (actor: Actor) => void;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
  showSupportButton?: boolean;
  onSubscribe?: () => void;
  isPremiumMovie?: boolean;
  isPremiumSubscriber?: boolean;
}

const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void; }> = ({ movie, onClick }) => {
    return (
        <div
            className="group relative cursor-pointer rounded-md overflow-hidden aspect-[3/4] bg-gray-900"
            onClick={() => onClick(movie)}
        >
              <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
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
  onSelectRecommendedMovie,
  showSupportButton = true,
  onSubscribe,
  isPremiumMovie,
  isPremiumSubscriber
}) => {
  const { user, toggleWatchlist } = useAuth();
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showSupportSuccess, setShowSupportSuccess] = useState(false);

  const [released, setReleased] = useState(() => isMovieReleased(movie));
  
  const isOnWatchlist = useMemo(() => user?.watchlist?.includes(movie.key), [user, movie.key]);

  useEffect(() => {
    if (released) return;

    if (isMovieReleased(movie)) {
      setReleased(true);
      return;
    }
    
    const interval = setInterval(() => {
      if (isMovieReleased(movie)) {
        setReleased(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [movie, released]);


  // Reset modal state when the movie prop changes
  useEffect(() => {
    setReleased(isMovieReleased(movie));
    
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

  const handleToggleWatchlist = async () => {
      if (isTogglingWatchlist) return;
      setIsTogglingWatchlist(true);
      try {
          await toggleWatchlist(movie.key);
      } catch (error) {
          console.error(error);
          // Optionally show an error to the user
      } finally {
          setIsTogglingWatchlist(false);
      }
  };
  
  const handleSelectMovieFromDirector = (selectedMovie: Movie) => {
    setSelectedDirector(null);
    onSelectRecommendedMovie(selectedMovie);
  };

  const handlePaymentSuccess = () => {
      setShowSupportSuccess(true);
      setTimeout(() => setShowSupportSuccess(false), 3000);
  };

  const recommendedMovies = useMemo(() => {
    if (!movie) return [];
    const recommendedKeys = new Set<string>();
    // FIX: Add explicit type 'Category' to the 'cat' parameter to fix TypeScript inference issue.
    const currentMovieCategories = Object.values(allCategories).filter((cat: Category) => cat.movieKeys.includes(movie.key));
    
    // FIX: Add explicit type 'Category' to the 'cat' parameter to fix TypeScript inference issue.
    currentMovieCategories.forEach((cat: Category) => {
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

  const handlePlayMovie = () => {
      onClose(); // Close the modal
      handleNavigate(`/movie/${movie.key}?play=true`); // Navigate to the dedicated page and play
  };

  return (
    <>
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
          <div className="relative w-full h-full">
            <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
          </div>

          <div className="absolute bottom-6 left-6 text-white z-10">
            <h2 className="text-2xl md:text-4xl font-bold drop-shadow-lg mb-4 flex items-center gap-3">
              {movie.title || 'Untitled Film'}
              {isPremiumMovie && <span className="text-sm font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-md">PREMIUM</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {released ? (
                <>
                  {isPremiumMovie && !isPremiumSubscriber ? (
                    <button onClick={onSubscribe} className="flex items-center justify-center px-4 py-2 bg-yellow-500 text-black font-bold rounded-md hover:bg-yellow-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        Join Premium to Watch
                    </button>
                  ) : movie.fullMovie ? (
                    <button onClick={handlePlayMovie} className="flex items-center justify-center px-4 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        Play Full Movie
                    </button>
                  ) : null}
                  {showSupportButton && (
                    <button onClick={() => setIsSupportModalOpen(true)} className="flex items-center justify-center px-4 py-2 bg-purple-600/80 text-white font-bold rounded-md hover:bg-purple-700/80 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                       </svg>
                       Support Filmmaker
                    </button>
                  )}
                </>
              ) : (
                <div className="bg-red-900/50 text-red-200 border border-red-700 rounded-md px-4 py-2 text-center">
                  <p className="font-bold">Coming Soon!</p>
                  {movie.releaseDateTime && <Countdown targetDate={movie.releaseDateTime} onEnd={() => setReleased(true)} className="text-sm" />}
                </div>
              )}
              <button onClick={handleToggleWatchlist} disabled={isTogglingWatchlist} className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition">
                {isOnWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                )}
              </button>
              <button onClick={handleToggleLike} className={`h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
            {showSupportSuccess && (
              <div className="mt-4 bg-green-500/80 text-white font-bold py-2 px-4 rounded-md inline-block animate-[fadeIn_0.5s_ease-out]">
                  Thank you for your support!
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="text-gray-300 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}></div>
              <div className="mt-6 bg-gradient-to-r from-red-500/10 to-blue-500/10 p-3 rounded-lg text-center border border-gray-700">
                <p className="text-sm text-white">✨ Click an actor's name for their bio & an AI-generated fun fact!</p>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex items-start gap-6 mb-6">
                {movie.rating && movie.rating > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-400 mb-1">Rating</h3>
                        <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <p className="text-white font-bold text-base">{movie.rating.toFixed(1)}<span className="text-gray-400 font-normal">/10</span></p>
                        </div>
                    </div>
                )}
                {movie.durationInMinutes && movie.durationInMinutes > 0 && (
                  <div>
                      <h3 className="text-lg font-semibold text-gray-400 mb-1">Duration</h3>
                      <p className="text-white text-base">{movie.durationInMinutes} min</p>
                  </div>
                )}
              </div>

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
    {isSupportModalOpen && (
        <SquarePaymentModal
            movie={movie}
            paymentType="donation"
            onClose={() => setIsSupportModalOpen(false)}
            onPaymentSuccess={handlePaymentSuccess}
        />
    )}
    </>
  );
};

export default MovieDetailsModal;