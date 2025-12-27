import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category, Episode } from '../types';
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
  onSupportMovie: (movie: Movie) => void;
  onSubscribe?: () => void;
  isPremiumMovie?: boolean;
  isPremiumSubscriber?: boolean;
  onPlayMovie?: (movie: Movie) => void;
}

const EpisodeRow: React.FC<{ episode: Episode; onPlay: () => void }> = ({ episode, onPlay }) => (
    <div className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition-all">
        <div className="flex-shrink-0 w-10 h-10 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center font-black group-hover:bg-red-600 group-hover:text-white transition-colors cursor-pointer" onClick={onPlay}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
        </div>
        <div className="flex-grow min-w-0">
            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{episode.title}</h4>
            <p className="text-xs text-gray-400 line-clamp-1">{episode.synopsis}</p>
        </div>
        {episode.duration && <span className="text-[10px] font-bold text-gray-600">{episode.duration}m</span>}
    </div>
);

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
  isPremiumMovie,
  onPlayMovie,
}) => {
  const { user, watchlist, toggleWatchlist } = useAuth();
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const [released, setReleased] = useState(() => isMovieReleased(movie));
  const isOnWatchlist = useMemo(() => watchlist.includes(movie.key), [watchlist, movie.key]);
  
  const expiryDate = useMemo(() => {
    if (!movie.publishedAt) return null;
    const date = new Date(movie.publishedAt);
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }, [movie.publishedAt]);

  const canCollectDonations = useMemo(() => {
    if (!movie) return false;
    const isVintage = allCategories.publicDomainIndie?.movieKeys?.includes(movie.key);
    const isCopyrightRestricted = movie.hasCopyrightMusic === true;
    const isManualDisabled = movie.isSupportEnabled === false;
    return !isVintage && !isCopyrightRestricted && !isManualDisabled;
  }, [movie, allCategories]);

  useEffect(() => {
    if (released) return;
    const interval = setInterval(() => {
      if (isMovieReleased(movie)) {
        setReleased(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [movie, released]);

  const handlePlayButtonClick = (url?: string) => {
      if (onPlayMovie) onPlayMovie(movie);
      else {
          onClose();
          const targetUrl = url ? encodeURIComponent(url) : '';
          window.history.pushState({}, '', `/movie/${movie.key}?play=true${targetUrl ? `&stream=${targetUrl}` : ''}`);
          window.dispatchEvent(new Event('pushstate'));
      }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div 
        className="bg-[#111] md:rounded-xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[92vh] overflow-y-auto relative scrollbar-hide border border-white/5"
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
      >
        <button onClick={onClose} className="fixed md:absolute top-5 right-5 text-white bg-black/40 backdrop-blur-xl rounded-full p-2.5 hover:bg-red-600 transition-all z-50 shadow-2xl border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-full aspect-video bg-black overflow-hidden">
            <img src={movie.poster} alt="" className="w-full h-full object-cover animate-ken-burns opacity-60 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-black/20"></div>
            
            <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter">{movie.title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {released ? (
                        <>
                            {!movie.isSeries && (
                                <button onClick={() => handlePlayButtonClick()} className="flex items-center justify-center px-8 py-3 bg-white text-black font-black rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 shadow-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                    Play
                                </button>
                            )}
                            {canCollectDonations && (
                                <button onClick={() => onSupportMovie(movie)} className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-black rounded-lg hover:bg-purple-500 transition-all transform hover:scale-105 shadow-2xl">
                                    Support Creator
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="bg-blue-600 text-white font-black px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                            <span className="uppercase text-xs tracking-widest">Coming Soon</span>
                            <Countdown targetDate={movie.releaseDateTime!} onEnd={() => setReleased(true)} className="text-sm" />
                        </div>
                    )}
                    
                    <button onClick={() => toggleWatchlist(movie.key)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all">
                        {isOnWatchlist ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
                <div className="text-gray-300 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                
                {movie.isSeries && movie.episodes && movie.episodes.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-red-600 pl-4">Episodes</h3>
                        <div className="grid gap-3">
                            {movie.episodes.map(ep => (
                                <EpisodeRow key={ep.id} episode={ep} onPlay={() => handlePlayButtonClick(ep.url)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-8 border-l border-white/5 pl-0 md:pl-12">
                {expiryDate && (
                    <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2">Licensing Window</h3>
                        <p className="text-sm font-bold text-white">Removal Date:</p>
                        <p className="text-xs text-gray-400">{expiryDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                )}

                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Cast</h3>
                    <div className="space-y-2">
                        {movie.cast.map(actor => (
                            <button key={actor.name} className="block w-full text-left text-white font-bold hover:text-red-500 transition-colors" onClick={() => onSelectActor(actor)}>{actor.name}</button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Director</h3>
                    <p className="text-white font-bold">{movie.director}</p>
                </div>
            </div>
        </div>

        {selectedDirector && (
            <DirectorCreditsModal
                directorName={selectedDirector}
                onClose={() => setSelectedDirector(null)}
                allMovies={allMovies}
                onSelectMovie={onSelectRecommendedMovie}
            />
        )}
      </div>
    </div>
  );
};

export default MovieDetailsModal;