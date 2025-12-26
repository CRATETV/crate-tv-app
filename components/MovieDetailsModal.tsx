import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import SquarePaymentModal from './SquarePaymentModal';
import DonationSuccessModal from './DonationSuccessModal';
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
  onSupportMovie: (movie: Movie) => void;
  onSubscribe?: () => void;
  isPremiumMovie?: boolean;
  isPremiumSubscriber?: boolean;
  onPlayMovie?: (movie: Movie) => void;
}

const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void; }> = ({ movie, onClick }) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    return (
        <div
            className="group relative cursor-pointer rounded-md overflow-hidden aspect-[3/4] bg-gray-900"
            onClick={() => onClick(movie)}
        >
              {!isImageLoaded && (
                <div className="absolute inset-0 shimmer-bg"></div>
              )}
              <img
                  src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                  alt={movie.title}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  loading="lazy"
                  onLoad={() => setIsImageLoaded(true)}
                  onContextMenu={(e) => e.preventDefault()}
                  crossOrigin="anonymous"
              />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
};

const getWatchPartyStatus = (movie: Movie): 'not_enabled' | 'upcoming' | 'live' | 'ended' => {
    if (!movie?.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return 'not_enabled';
    }
    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
    if (now < startTime) return 'upcoming';
    else if (now >= startTime && now <= endTime) return 'live';
    else return 'ended';
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
  onSupportMovie,
  onSubscribe,
  isPremiumMovie,
  isPremiumSubscriber,
  onPlayMovie,
}) => {
  const { user, watchlist, toggleWatchlist } = useAuth();
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [released, setReleased] = useState(() => isMovieReleased(movie));
  const [watchPartyStatus, setWatchPartyStatus] = useState(() => getWatchPartyStatus(movie));
  
  const isOnWatchlist = useMemo(() => watchlist.includes(movie.key), [watchlist, movie.key]);
  const synopsisText = movie.synopsis || '';
  const synopsisIsLong = synopsisText.replace(/<[^>]+>/g, '').length > 200;

  // LICENSING RESTRICTIONS:
  // No donations for Vintage Visions (publicDomainIndie) or Licensed content (hasCopyrightMusic or specific titles)
  const canCollectDonations = useMemo(() => {
    if (!movie) return false;
    const isVintage = allCategories.publicDomainIndie?.movieKeys?.includes(movie.key);
    const isLicensedTitle = movie.title?.toLowerCase().includes('last christmas');
    return !isVintage && !movie.hasCopyrightMusic && !isLicensedTitle;
  }, [movie, allCategories]);

  useEffect(() => {
    const status = getWatchPartyStatus(movie);
    setWatchPartyStatus(status);
    if (status === 'upcoming' && movie.watchPartyStartTime) {
        const startTime = new Date(movie.watchPartyStartTime).getTime();
        const interval = setInterval(() => {
            if (Date.now() >= startTime) {
                setWatchPartyStatus('live');
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [movie]);

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

  useEffect(() => {
    setReleased(isMovieReleased(movie));
    if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
  }, [movie]);
  
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
      timers.current.forEach(clearTimeout);
    };
  }, [onClose]);

  const handleToggleLike = () => {
    setIsAnimatingLike(true);
    timers.current.forEach(clearTimeout);
    const timer = setTimeout(() => setIsAnimatingLike(false), 500);
    timers.current = [timer];
    onToggleLike(movie.key);
  };

  const handleToggleWatchlist = async () => {
      if (isTogglingWatchlist) return;
      setIsTogglingWatchlist(true);
      try { await toggleWatchlist(movie.key); } catch (error) { console.error(error); } finally { setIsTogglingWatchlist(false); }
  };
  
  const handleSelectMovieFromDirector = (selectedMovie: Movie) => {
    setSelectedDirector(null);
    onSelectRecommendedMovie(selectedMovie);
  };

  const recommendedMovies = useMemo(() => {
    if (!movie) return [];
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(allCategories).filter((cat: Category) => cat.movieKeys.includes(movie.key));
    currentMovieCategories.forEach((cat: Category) => { cat.movieKeys.forEach(key => { if (key !== movie.key) recommendedKeys.add(key); }); });
    return Array.from(recommendedKeys).map(key => allMovies[key]).filter(Boolean).slice(0, 7);
  }, [movie, allMovies, allCategories]);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  const handlePlayButtonClick = () => {
      if (onPlayMovie) onPlayMovie(movie);
      else {
          onClose();
          handleNavigate(`/movie/${movie.key}?play=true`);
      }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div 
        className="bg-[#111] md:rounded-xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[92vh] overflow-y-auto relative scrollbar-hide border border-white/5"
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
      >
        <button onClick={onClose} className="fixed md:absolute top-5 right-5 text-white bg-black/40 backdrop-blur-xl rounded-full p-2.5 hover:bg-red-600 transition-all z-50 shadow-2xl border border-white/10 group active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <div className="relative w-full h-full">
            <img
                src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                alt={movie.title}
                className="w-full h-full object-cover animate-ken-burns opacity-70"
                onContextMenu={(e) => e.preventDefault()}
                crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-black/20"></div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 text-white z-10">
            <h2 className="text-3xl md:text-5xl font-black drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mb-6 flex items-center gap-3">
              {movie.title || 'Untitled Film'}
              {isPremiumMovie && <span className="text-xs font-black bg-yellow-500 text-black px-3 py-1 rounded-full">PREMIUM</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {released ? (
                <>
                   <button 
                      onClick={handlePlayButtonClick} 
                      className="flex items-center justify-center px-8 py-3 bg-white text-black font-black rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        Play
                    </button>

                  {canCollectDonations && (
                    <button 
                      onClick={() => onSupportMovie(movie)} 
                      className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-black rounded-lg hover:bg-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                       </svg>
                       Support Filmmaker
                    </button>
                  )}
                </>
              ) : (
                <div className="bg-red-600 text-white font-black px-6 py-2 rounded-lg shadow-lg">
                  Coming Soon! <Countdown targetDate={movie.releaseDateTime!} onEnd={() => setReleased(true)} className="ml-2" />
                </div>
              )}
              
              <button onClick={handleToggleWatchlist} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-90">
                {isOnWatchlist ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
              </button>

              <button onClick={handleToggleLike} className={`w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-90 ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2">
              <div className="relative">
                <div className={`text-gray-300 text-lg leading-relaxed ${!isExpanded && synopsisIsLong ? 'line-clamp-4' : ''}`} dangerouslySetInnerHTML={{ __html: synopsisText }}></div>
                {synopsisIsLong && !isExpanded && (
                   <button onClick={() => setIsExpanded(true)} className="text-white font-bold mt-2 hover:underline">Show more</button>
                )}
              </div>
              
              <div className="mt-12 bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                 <span className="text-2xl">✨</span>
                 <p className="text-sm font-medium text-gray-200">Click an actor's name below to reveal their story and a unique AI-generated fun fact!</p>
              </div>
            </div>

            <div className="space-y-8 border-l border-white/5 pl-0 md:pl-12">
              {movie.rating ? (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Platform Rating</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-xl font-black">★ {movie.rating.toFixed(1)}</span>
                    <span className="text-gray-600 font-bold">/ 10</span>
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Cast</h3>
                <div className="space-y-2.5">
                  {movie.cast.map((actor) => (
                    <button key={actor.name} className="block w-full text-left text-white font-bold hover:text-red-500 transition-colors" onClick={() => onSelectActor(actor)}>
                      {actor.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Director</h3>
                <div className="space-y-2">
                  {movie.director.split(',').map(name => (
                    <button key={name} className="block w-full text-left text-white font-bold hover:text-red-500 transition-colors" onClick={() => setSelectedDirector(name.trim())}>
                      {name.trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {recommendedMovies.length > 0 && (
            <div className="mt-16 pt-12 border-t border-white/5">
              <h3 className="text-2xl font-black mb-8">More Like This</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {recommendedMovies.map(recMovie => (
                  <RecommendedMovieCard key={recMovie.key} movie={recMovie} onClick={onSelectRecommendedMovie} />
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedDirector && (
            <div className="z-[110]">
                <DirectorCreditsModal
                    directorName={selectedDirector}
                    onClose={() => setSelectedDirector(null)}
                    allMovies={allMovies}
                    onSelectMovie={handleSelectMovieFromDirector}
                />
            </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MovieDetailsModal;