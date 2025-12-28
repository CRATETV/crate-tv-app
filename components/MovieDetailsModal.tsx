
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category, Episode } from '../types';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import SquarePaymentModal from './SquarePaymentModal';

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
  onClose, 
  onSelectActor, 
  allMovies,
  allCategories,
  onSelectRecommendedMovie,
  onSupportMovie,
  onPlayMovie,
}) => {
  const { watchlist, toggleWatchlist, rentals, purchaseMovie } = useAuth();
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const [released, setReleased] = useState(() => isMovieReleased(movie));
  const isOnWatchlist = useMemo(() => watchlist.includes(movie.key), [watchlist, movie.key]);
  
  const isRented = useMemo(() => {
    const expiration = rentals[movie.key];
    if (!expiration) return false;
    return new Date(expiration) > new Date();
  }, [rentals, movie.key]);

  const needsPurchase = movie.isForSale && !isRented;
  
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
    return !isVintage && !isCopyrightRestricted && !isManualDisabled && !movie.isForSale;
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

  useEffect(() => {
    if (!isRented || !rentals[movie.key]) return;

    const timer = setInterval(() => {
        const expiration = new Date(rentals[movie.key]);
        const now = new Date();
        const diff = expiration.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeRemaining(null);
            clearInterval(timer);
        } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setTimeRemaining(`${h}h ${m}m remaining`);
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [movie.key, rentals, isRented]);

  const handlePlayButtonClick = (url?: string) => {
      if (needsPurchase) {
          setShowPurchaseModal(true);
          return;
      }
      if (onPlayMovie) onPlayMovie(movie);
      else {
          onClose();
          const targetUrl = url ? encodeURIComponent(url) : '';
          window.history.pushState({}, '', `/movie/${movie.key}?play=true${targetUrl ? `&stream=${targetUrl}` : ''}`);
          window.dispatchEvent(new Event('pushstate'));
      }
  };

  const handlePurchaseSuccess = async () => {
      await purchaseMovie(movie.key);
      setShowPurchaseModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div 
        className="bg-[#0a0a0a] md:rounded-3xl shadow-2xl w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] overflow-y-auto relative scrollbar-hide border border-white/10"
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
      >
        <button onClick={onClose} className="fixed md:absolute top-5 right-5 text-white bg-black/40 backdrop-blur-xl rounded-full p-2.5 hover:bg-red-600 transition-all z-50 shadow-2xl border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-full aspect-video bg-black overflow-hidden">
            <img src={movie.poster} alt="" className="w-full h-full object-cover animate-ken-burns opacity-60 blur-sm scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/30"></div>
            
            <div className="absolute bottom-10 left-10 right-10 text-white z-10">
                <div className="flex items-center gap-4 mb-4">
                   <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">{movie.title}</h2>
                   {timeRemaining && (
                        <div className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse shadow-lg">
                            {timeRemaining}
                        </div>
                   )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {released ? (
                        <>
                            {!movie.isSeries && (
                                <button 
                                    onClick={() => handlePlayButtonClick()} 
                                    className={`flex items-center justify-center px-10 py-4 ${needsPurchase ? 'bg-green-600 text-white' : 'bg-white text-black'} font-black rounded-xl hover:opacity-90 transition-all transform hover:scale-105 active:scale-95 shadow-2xl`}
                                >
                                    {needsPurchase ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Rent Film (24h) - ${movie.salePrice?.toFixed(2)}
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                            Play Now
                                        </>
                                    )}
                                </button>
                            )}
                            {canCollectDonations && (
                                <button onClick={() => onSupportMovie(movie)} className="flex items-center justify-center px-8 py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-500 transition-all transform hover:scale-105 active:scale-95 shadow-xl">
                                    Support Creator
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="bg-blue-600 text-white font-black px-8 py-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center gap-4">
                            <span className="uppercase text-xs tracking-widest bg-white/20 px-2 py-0.5 rounded">Premieres Soon</span>
                            <Countdown targetDate={movie.releaseDateTime!} onEnd={() => setReleased(true)} className="text-lg font-mono" />
                        </div>
                    )}
                    
                    <button onClick={() => toggleWatchlist(movie.key)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-90 shadow-xl">
                        {isOnWatchlist ? <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="p-10 md:p-14 grid grid-cols-1 lg:grid-cols-3 gap-14">
            <div className="lg:col-span-2 space-y-10">
                <div className="text-gray-300 text-xl leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                
                {movie.isSeries && movie.episodes && movie.episodes.length > 0 && (
                    <div className="space-y-8 pt-6 border-t border-white/5">
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest border-l-4 border-red-600 pl-4">Episode Browser</h3>
                        <div className="grid gap-4">
                            {movie.episodes.map(ep => (
                                <EpisodeRow key={ep.id} episode={ep} onPlay={() => handlePlayButtonClick(ep.url)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-10 border-l border-white/5 pl-0 lg:pl-14">
                {expiryDate && (
                    <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-2xl shadow-inner">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-3">Licensing Status</h3>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white uppercase tracking-tighter">Scheduled Removal:</p>
                            <p className="text-xs text-gray-500 font-mono">{expiryDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">The Cast</h3>
                    <div className="flex flex-wrap gap-2">
                        {movie.cast.map(actor => (
                            <button 
                                key={actor.name} 
                                className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-white font-bold text-xs hover:bg-red-600 transition-colors" 
                                onClick={() => onSelectActor(actor)}
                            >
                                {actor.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Directed By</h3>
                    <p className="text-white font-black text-xl tracking-tighter uppercase">{movie.director}</p>
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

        {showPurchaseModal && (
            <SquarePaymentModal
                paymentType="movie"
                movie={movie}
                onClose={() => setShowPurchaseModal(false)}
                onPaymentSuccess={handlePurchaseSuccess}
            />
        )}
      </div>
    </div>
  );
};

export default MovieDetailsModal;
