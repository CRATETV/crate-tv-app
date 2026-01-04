
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

const SecureWatermark: React.FC<{ email: string; isTriggered: boolean }> = ({ email, isTriggered }) => (
    <div className={`absolute inset-0 pointer-events-none z-[45] overflow-hidden select-none transition-opacity duration-1000 ${isTriggered ? 'opacity-20' : 'opacity-0'}`}>
        <div className="dynamic-watermark absolute whitespace-nowrap bg-white/20 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.3em] border border-white/10 backdrop-blur-md shadow-2xl">
            SECURITY TRACE // {email.toUpperCase()} // AUTH_ENFORCED
        </div>
    </div>
);

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user, likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist, rentals } = useAuth();
  const { movies: allMovies, categories: allCategories, isLoading: isDataLoading } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  
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
  const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTrackedViewRef = useRef(false);
  const securityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const triggerSecurity = () => {
        setIsSecurityTriggered(true);
        if (securityTimeoutRef.current) clearTimeout(securityTimeoutRef.current);
        securityTimeoutRef.current = setTimeout(() => setIsSecurityTriggered(false), 8000);
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (playerMode !== 'full') return;
        const blockedKeys = ['PrintScreen', 'F12', 'F11'];
        const blockedCombos = (e.ctrlKey || e.metaKey) && ['s', 'u', 'i', 'j', 'c'].includes(e.key.toLowerCase());
        if (blockedKeys.includes(e.key) || blockedCombos) {
            triggerSecurity();
        }
    };

    const handleFocusOut = () => {
        if (playerMode === 'full') triggerSecurity();
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && playerMode === 'full') {
            triggerSecurity();
        }
    };

    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('blur', handleFocusOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
        window.removeEventListener('keydown', handleKeydown, true);
        window.removeEventListener('blur', handleFocusOut);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (securityTimeoutRef.current) clearTimeout(securityTimeoutRef.current);
    };
  }, [playerMode]);

  const hasAccess = useMemo(() => {
    if (!movie) return false;
    if (!movie.isForSale) return true;
    const expiration = rentals[movieKey];
    return expiration ? new Date(expiration) > new Date() : false;
  }, [movie, rentals, movieKey]);

  useEffect(() => {
    if (movie) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('play') === 'true' && hasAccess && isMovieReleased(movie)) {
            setPlayerMode('full');
        } else {
            setPlayerMode('poster');
        }
    }
  }, [movie, hasAccess, movieKey]);

  const handleGoHome = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  }, []);

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
            console.warn("Playback initialization deferred for user interaction.");
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

  useEffect(() => {
      if (playerMode === 'full' && videoRef.current && hasAccess) {
          playContent();
      }
  }, [playerMode, hasAccess, playContent]);

  if (isDataLoading) return <LoadingSpinner />;
  if (!movie) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-800 bg-black">Content Restricted</div>;

  const embedUrl = getEmbedUrl(movie.fullMovie);
  const seoDescription = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();
  const isLiked = likedMoviesArray.includes(movieKey);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#050505] text-white">
        <SEO title={movie.title} description={seoDescription} image={movie.poster} type="video.movie" />
        {playerMode !== 'full' && <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={true} />}
        
        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
            <div 
                className={`relative w-full ${playerMode === 'full' ? 'h-screen' : 'aspect-video'} bg-black shadow-2xl overflow-hidden secure-video-container`} 
                onContextMenu={(e) => e.preventDefault()}
            >
                {playerMode === 'full' ? (
                    hasAccess ? (
                        embedUrl ? (
                            <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
                        ) : (
                            <div className="relative w-full h-full" onClick={toggleManualPause}>
                                {user?.email && <SecureWatermark email={user.email} isTriggered={isSecurityTriggered} />}

                                <video 
                                    ref={videoRef} 
                                    src={movie.fullMovie} 
                                    className={`w-full h-full object-contain block transition-opacity duration-1000 ${isEnded ? 'opacity-30 blur-md' : 'opacity-100'}`} 
                                    controls={false}
                                    playsInline 
                                    preload="auto" 
                                    autoPlay 
                                    onPause={() => !isEnded && setIsPaused(true)} 
                                    onPlay={() => !isEnded && setIsPaused(false)}
                                    onEnded={() => setIsEnded(true)}
                                    controlsList="nodownload" 
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                                
                                {isPaused && !isEnded && (
                                    <PauseOverlay 
                                        movie={movie} 
                                        isLiked={isLiked} 
                                        isOnWatchlist={watchlist.includes(movieKey)} 
                                        onMoreDetails={() => setIsDetailsModalOpen(true)} 
                                        onSelectActor={setSelectedActor} 
                                        onResume={() => {
                                            videoRef.current?.play();
                                            setIsPaused(false);
                                        }} 
                                        onRewind={() => videoRef.current && (videoRef.current.currentTime -= 10)} 
                                        onForward={() => videoRef.current && (videoRef.current.currentTime += 10)} 
                                        onToggleLike={() => toggleLikeMovie(movieKey)} 
                                        onToggleWatchlist={() => toggleWatchlist(movieKey)} 
                                        onSupport={() => setIsSupportModalOpen(true)} 
                                        onHome={handleGoHome} 
                                    />
                                )}

                                {isEnded && (
                                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.8s_ease-out]">
                                        <div className="max-w-2xl space-y-10">
                                            <div>
                                                <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs mb-4">Transmission Complete</p>
                                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">{movie.title}</h2>
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-4">Directed by {movie.director}</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleLikeMovie(movieKey); }}
                                                    className={`p-8 rounded-[2.5rem] border transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 group ${isLiked ? 'bg-red-600 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 hover:border-red-600/50'}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${isLiked ? 'text-white' : 'text-gray-500 group-hover:text-red-500'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-lg font-black uppercase tracking-tight">{isLiked ? 'In My Favorites' : 'Add to Favorites'}</p>
                                                        <p className="text-[10px] uppercase font-bold opacity-60">Help others discover this film</p>
                                                    </div>
                                                </button>

                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setIsSupportModalOpen(true); }}
                                                    className="p-8 rounded-[2.5rem] bg-purple-600 hover:bg-purple-500 border border-purple-400/30 transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(147,51,234,0.4)]"
                                                >
                                                    <span className="text-5xl">💎</span>
                                                    <div>
                                                        <p className="text-lg font-black uppercase tracking-tight">Support Creator</p>
                                                        <p className="text-[10px] uppercase font-bold text-purple-200">70% goes directly to {movie.director.split(',')[0]}</p>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-8">
                                                <button onClick={handleGoHome} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Return to Library</button>
                                                <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                                                <button onClick={() => { setIsEnded(false); if(videoRef.current) videoRef.current.currentTime = 0; videoRef.current?.play(); }} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Re-Watch Session</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/95">
                            <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">Rental Required</h2>
                            <p className="text-gray-400 mb-8 text-center max-w-sm">This film is locked behind a cinematic paywall. Renting grants 24-hour access to the master high-bitrate file.</p>
                            <button onClick={() => setIsPurchaseModalOpen(true)} className="px-12 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all shadow-xl">Authorize</button>
                            <button onClick={handleGoHome} className="mt-8 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">Return to Home</button>
                        </div>
                    )
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                         <img src={movie.poster} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20" alt="" />
                         <img src={movie.poster} className="relative w-full h-full object-contain max-w-2xl rounded-lg shadow-2xl border border-white/5" alt={movie.title} />
                         <div className="absolute top-8 left-8">
                             <button onClick={handleGoHome} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Home
                             </button>
                         </div>
                         <button onClick={() => {
                             if (hasAccess) {
                                 window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
                                 window.dispatchEvent(new Event('pushstate'));
                             } else {
                                 setIsPurchaseModalOpen(true);
                             }
                         }} className="absolute bg-white/10 backdrop-blur-md rounded-full p-8 border-4 border-white/20 hover:scale-110 transition-all shadow-2xl group">
                            <svg className="w-16 h-16 text-white group-hover:text-red-500 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                         </button>
                    </div>
                )}
            </div>

            {playerMode !== 'full' && (
                <div className="max-w-[1400px] mx-auto p-6 md:p-14 lg:p-24 space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="space-y-4 max-w-4xl">
                            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85]">{movie.title}</h1>
                            <p className="text-red-500 font-black uppercase tracking-[0.4em] text-xs">Dir. {movie.director}</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button onClick={() => setIsSupportModalOpen(true)} className="flex-1 md:flex-none bg-purple-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-purple-700 transition-all active:scale-95 animate-pulse">Support Creator</button>
                            <button onClick={() => setIsDetailsModalOpen(true)} className="flex-1 md:flex-none bg-white/5 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10">Full Credits</button>
                        </div>
                    </div>
                    <div className="text-gray-300 text-xl md:text-2xl leading-relaxed font-medium max-w-4xl" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                    <RokuBanner />
                </div>
            )}
        </main>
        
        {playerMode !== 'full' && <Footer />}
        <BackToTopButton />
        
        {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        {isDetailsModalOpen && <MovieDetailsModal movie={movie} isLiked={likedMoviesArray.includes(movieKey)} onToggleLike={toggleLikeMovie} onClose={() => setIsDetailsModalOpen(false)} onSelectActor={setSelectedActor} allMovies={allMovies} allCategories={allCategories} onSelectRecommendedMovie={(m: Movie) => window.location.href = `/movie/${m.key}`} onSupportMovie={() => setIsSupportModalOpen(true)} />}
        {isPurchaseModalOpen && <SquarePaymentModal movie={movie} paymentType="movie" onClose={() => setIsPurchaseModalOpen(false)} onPaymentSuccess={() => window.location.reload()} />}
        {isSupportModalOpen && <SquarePaymentModal movie={movie} paymentType="donation" onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={() => alert('Support recorded.')} />}
    </div>
  );
};

export default MoviePage;
