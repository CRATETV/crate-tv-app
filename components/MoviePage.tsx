
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import RokuBanner from './RokuBanner';
import SquarePaymentModal from './SquarePaymentModal';
import SEO from './SEO';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';
import CastButton from './CastButton';

interface MoviePageProps {
  movieKey: string;
}

const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ff0000&title=0&byline=0&portrait=0`;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    return null;
};

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user, likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist, rentals, hasJuryPass, purchaseMovie } = useAuth();
  const { movies: allMovies, categories: allCategories, isLoading: isDataLoading } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [playerMode, setPlayerMode] = useState<'poster' | 'full'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('play') === 'true' ? 'full' : 'poster';
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTrackedViewRef = useRef(false);

  const isLiked = useMemo(() => likedMoviesArray.includes(movieKey), [likedMoviesArray, movieKey]);

  const hasAccess = useMemo(() => {
    if (!movie) return false;
    const hasGuestPass = localStorage.getItem('crate_guest_jury_active') === 'true';
    if (hasJuryPass || hasGuestPass) return true;
    if (!movie.isForSale) return true;
    const expiration = rentals[movieKey];
    return expiration ? new Date(expiration) > new Date() : false;
  }, [movie, rentals, movieKey, hasJuryPass]);

  useEffect(() => {
    const onUrlChange = () => {
        setCurrentSearch(window.location.search);
    };
    window.addEventListener('pushstate', onUrlChange);
    window.addEventListener('popstate', onUrlChange);
    return () => {
        window.removeEventListener('pushstate', onUrlChange);
        window.removeEventListener('popstate', onUrlChange);
    };
  }, []);

  useEffect(() => {
    if (movie) {
        const params = new URLSearchParams(currentSearch);
        if (params.get('play') === 'true' && hasAccess && isMovieReleased(movie)) {
            setPlayerMode('full');
            setIsEnded(false);
            if (videoRef.current && videoRef.current.ended) {
                videoRef.current.currentTime = 0;
            }
        } else {
            setPlayerMode('poster');
        }
    }
  }, [movie, hasAccess, movieKey, currentSearch]);

  const handleGoHome = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  }, []);

  const handleToggleLike = () => {
    setIsAnimatingLike(true);
    toggleLikeMovie(movieKey);
    setTimeout(() => setIsAnimatingLike(false), 600);
  };

  const playContent = useCallback(async () => {
    if (videoRef.current && movie?.key) {
        try {
            if (!hasTrackedViewRef.current) {
                hasTrackedViewRef.current = true;
                const token = await getUserIdToken();
                if (token) {
                    fetch('/api/track-view', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ movieKey: movie.key }),
                    }).catch(() => {});
                }
            }
            await videoRef.current.play();
        } catch (e) {
            setIsPaused(true);
        }
    }
  }, [movie, getUserIdToken]);

  const toggleManualPause = (e: React.MouseEvent) => {
      if (isEnded) return;
      e.stopPropagation();
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPaused(false);
      } else {
          videoRef.current.pause();
          setIsPaused(true);
      }
  };

  const handlePurchaseSuccess = async () => {
      await purchaseMovie(movieKey);
      setIsPurchaseModalOpen(false);
  };

  useEffect(() => {
      if (playerMode === 'full' && videoRef.current && hasAccess) {
          playContent();
      }
  }, [playerMode, hasAccess, playContent, currentSearch]);

  if (isDataLoading) return <LoadingSpinner />;
  if (!movie) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-800 bg-black">Content Restricted</div>;

  const embedUrl = getEmbedUrl(movie.fullMovie);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
        <SEO title={movie.title} description={movie.synopsis.replace(/<[^>]+>/g, '').trim()} image={movie.poster} type="video.movie" />
        {playerMode !== 'full' && <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={true} />}
        
        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
            <div className={`relative w-full ${playerMode === 'full' ? 'h-screen' : 'aspect-video'} bg-black shadow-2xl overflow-hidden secure-video-container`} onContextMenu={(e) => e.preventDefault()}>
                {playerMode === 'full' ? (
                    hasAccess ? (
                        <>
                            {embedUrl ? (
                                <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen title={movie.title}></iframe>
                            ) : (
                                <div className="relative w-full h-full" onClick={toggleManualPause}>
                                    <video ref={videoRef} src={movie.fullMovie} className={`w-full h-full object-contain block transition-opacity duration-1000 ${isEnded ? 'opacity-30 blur-md' : 'opacity-100'}`} controls={false} playsInline autoPlay onPause={() => !isEnded && setIsPaused(true)} onPlay={() => !isEnded && setIsPaused(false)} onEnded={() => setIsEnded(true)} controlsList="nodownload" />
                                    
                                    <CastButton videoElement={videoRef.current} />

                                    {isPaused && !isEnded && <PauseOverlay movie={movie} isLiked={isLiked} isOnWatchlist={watchlist.includes(movieKey)} onMoreDetails={() => setIsDetailsModalOpen(true)} onSelectActor={setSelectedActor} onResume={() => { videoRef.current?.play(); setIsPaused(false); }} onRewind={() => videoRef.current && (videoRef.current.currentTime -= 10)} onForward={() => videoRef.current && (videoRef.current.currentTime += 10)} onToggleLike={handleToggleLike} onToggleWatchlist={() => toggleWatchlist(movieKey)} onSupport={() => setIsSupportModalOpen(true)} onHome={handleGoHome} />}
                                    
                                    {isEnded && (
                                        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.8s_ease-out] bg-black/40 backdrop-blur-sm">
                                            <div className="max-w-2xl w-full space-y-12">
                                                <div>
                                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-4">Transmission Complete</p>
                                                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">{movie.title}</h2>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-4">Directed by {movie.director}</p>
                                                </div>

                                                {/* Engagement Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
                                                    <button 
                                                        onClick={handleToggleLike}
                                                        className={`p-8 rounded-[2.5rem] border transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 group ${isLiked ? 'bg-red-600 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 hover:border-red-600/50'}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 transition-all ${isLiked ? 'text-white scale-110' : 'text-gray-500 group-hover:text-red-500'} ${isAnimatingLike ? 'animate-heartbeat' : ''}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                        </svg>
                                                        <div>
                                                            <p className="text-base font-black uppercase tracking-tight">{isLiked ? 'Applauded' : 'Applaud Film'}</p>
                                                            <p className="text-[8px] uppercase font-bold text-gray-500">Save to your favorites</p>
                                                        </div>
                                                    </button>

                                                    <button 
                                                        onClick={() => setIsSupportModalOpen(true)}
                                                        className="p-8 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(79,70,229,0.3)]"
                                                    >
                                                        <span className="text-4xl">💎</span>
                                                        <div>
                                                            <p className="text-base font-black uppercase tracking-tight">Support Creator</p>
                                                            <p className="text-[8px] uppercase font-bold text-indigo-200">Help sustain the craft</p>
                                                        </div>
                                                    </button>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center justify-center gap-10 pt-4">
                                                    <button onClick={handleGoHome} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Return to Library</button>
                                                    <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                                                    <button onClick={() => { setIsEnded(false); if(videoRef.current) videoRef.current.currentTime = 0; videoRef.current?.play(); }} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Re-Watch Session</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 bg-gray-900">
                             <img src={movie.poster} alt="" className="w-32 h-auto rounded-lg shadow-xl opacity-50" />
                             <h2 className="text-3xl font-black uppercase tracking-tighter">Access Locked</h2>
                             <p className="text-gray-400 max-w-md">This selection requires a verified rental or Jury Pass to stream.</p>
                             <button 
                                 onClick={() => setIsPurchaseModalOpen(true)}
                                 className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-xl shadow-2xl transition-all active:scale-95 uppercase text-xs tracking-widest"
                             >
                                 Unlock Selection // ${movie.salePrice}
                             </button>
                             <button onClick={handleGoHome} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">Return to Home</button>
                        </div>
                    )
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center group cursor-pointer" onClick={() => setIsDetailsModalOpen(true)}>
                         <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30" crossOrigin="anonymous" />
                         <img src={movie.poster} alt={movie.title} className="w-full h-full object-contain relative z-10" crossOrigin="anonymous" />
                         
                         <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6">
                             <div className="bg-white/10 backdrop-blur-md rounded-full p-8 border-2 border-white/20 scale-90 group-hover:scale-100 transition-transform shadow-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                             </div>
                         </div>
                    </div>
                )}
            </div>

            {playerMode !== 'full' && (
                <div className="max-w-6xl mx-auto p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                        <div className="md:w-2/3 space-y-8">
                            <div>
                                <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none">{movie.title}</h1>
                                <p className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mt-4">Directed by {movie.director}</p>
                            </div>
                            <div className="text-gray-300 text-lg leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                            <RokuBanner />
                        </div>
                        <div className="md:w-1/3 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
                            <button 
                                onClick={() => (hasAccess && isMovieReleased(movie)) ? setPlayerMode('full') : (movie.isForSale ? setIsPurchaseModalOpen(true) : setIsDetailsModalOpen(true))}
                                className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all active:scale-95"
                            >
                                {hasAccess ? 'Play Selection' : 'Unlock Now'}
                            </button>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-white/5 pb-2">Talent Involved</p>
                                <div className="flex flex-wrap gap-2">
                                    {movie.cast.map(actor => (
                                        <button key={actor.name} onClick={() => setSelectedActor(actor)} className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold text-[10px] transition-all uppercase">{actor.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>

        {playerMode !== 'full' && <Footer />}
        <BackToTopButton />

        {isDetailsModalOpen && (
            <MovieDetailsModal 
                movie={movie} 
                isLiked={isLiked} 
                onToggleLike={handleToggleLike} 
                onClose={() => setIsDetailsModalOpen(false)} 
                onSelectActor={setSelectedActor} 
                allMovies={allMovies} 
                allCategories={allCategories} 
                onSelectRecommendedMovie={(m) => { setIsDetailsModalOpen(false); window.history.pushState({}, '', `/movie/${m.key}`); window.dispatchEvent(new Event('pushstate')); }} 
                onSupportMovie={() => setIsSupportModalOpen(true)} 
                onPlayMovie={() => { setIsDetailsModalOpen(false); setPlayerMode('full'); }}
            />
        )}

        {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        
        {isPurchaseModalOpen && (
            <SquarePaymentModal 
                paymentType="movie" 
                movie={movie} 
                onClose={() => setIsPurchaseModalOpen(false)} 
                onPaymentSuccess={handlePurchaseSuccess} 
            />
        )}

        {isSupportModalOpen && (
            <SquarePaymentModal 
                paymentType="donation" 
                movie={movie} 
                onClose={() => setIsSupportModalOpen(false)} 
                onPaymentSuccess={() => setIsSupportModalOpen(false)} 
            />
        )}
    </div>
  );
};

export default MoviePage;
