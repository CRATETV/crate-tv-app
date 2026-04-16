
import { heroImage, cardImage } from '../services/imageUrl';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import RokuBanner from './RokuBanner';
import SquarePaymentModal from './SquarePaymentModal';
import DeepLinkUtility from './DeepLinkUtility';
import SEO from './SEO';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { useSessionGuard } from '../hooks/useSessionGuard';
import SessionKickedScreen from './SessionKickedScreen';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';
import VideoPlayer from './VideoPlayer';

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
  const { user, likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist, rentals, hasJuryPass, purchaseMovie, markAsWatched } = useAuth();
  const { movies: allMovies, categories: allCategories, isLoading: isDataLoading, festivalData } = useFestival();
  
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
  const [isDeepLinkOpen, setIsDeepLinkOpen] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTrackedViewRef = useRef(false);
  const [videoError, setVideoError] = useState(false);

  const isLiked = useMemo(() => likedMoviesArray.includes(movieKey), [likedMoviesArray, movieKey]);

  const hasAccess = useMemo(() => {
    if (!movie) return false;
    const hasGuestPass = localStorage.getItem('crate_guest_jury_active') === 'true';
    if (hasJuryPass || hasGuestPass) return true;
    if (!movie.isForSale) return true;
    const expiration = rentals[movieKey];
    return expiration ? new Date(expiration) > new Date() : false;
  }, [movie, rentals, movieKey, hasJuryPass]);

  // ── SESSION GUARD: protect festival/paid films from password sharing ────
  // A film needs protection if it's a paid watch party film the user has unlocked
  // (meaning they bought a ticket — so we need to make sure only they watch)
  const isFestivalFilm = useMemo(() => {
    if (!movie) return false;
    const allBlocks = festivalData.flatMap((d: any) => d.blocks);
    return allBlocks.some((b: any) => b.movieKeys?.includes(movieKey) && (b.price || 0) > 0);
  }, [movie, festivalData, movieKey]);

  const needsSessionGuard = isFestivalFilm && hasAccess;
  const { kicked: sessionKicked, reason: kickReason } = useSessionGuard(user?.uid, needsSessionGuard);

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

  // Ensure video always starts from beginning when loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      video.currentTime = 0;
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [movieKey]);

  useEffect(() => {
    if (movie) {
        const params = new URLSearchParams(currentSearch);
        if (params.get('play') === 'true' && hasAccess && isMovieReleased(movie)) {
            setPlayerMode('full');
            setIsEnded(false);
            // Play immediately - video is already preloading
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => setIsPaused(true));
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
            // Always start from beginning
            videoRef.current.currentTime = 0;
            markAsWatched(movie.key);
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
  }, [movie, getUserIdToken, markAsWatched]);

  const handlePurchaseSuccess = async () => {
      await purchaseMovie(movieKey);
      setIsPurchaseModalOpen(false);
      setPlayerMode('full');
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
                {/* Hidden preloader — buffers while on poster mode so play is instant */}
                {hasAccess && !embedUrl && playerMode !== 'full' && (
                    <video src={movie.fullMovie} preload="auto" muted playsInline className="hidden" aria-hidden="true" />
                )}

                {playerMode === 'full' ? (
                    hasAccess ? (
                        <>
                            {embedUrl ? (
                                <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen title={movie.title}></iframe>
                            ) : (
                                <VideoPlayer
                                    src={movie.fullMovie}
                                    autoPlay={true}
                                    onVideoReady={(el) => { (videoRef as React.MutableRefObject<HTMLVideoElement>).current = el; }}
                                    onPlay={() => { setVideoError(false); setIsPaused(false); }}
                                    onPause={() => setIsPaused(true)}
                                    onEnded={() => setIsEnded(true)}
                                    onError={() => setVideoError(true)}
                                >
                                    {/* Error overlay */}
                                    {videoError && (
                                        <div className="absolute inset-0 z-[150] flex flex-col items-center justify-center bg-black/90 gap-4" onClick={e => e.stopPropagation()}>
                                            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <p className="text-white font-black uppercase tracking-widest text-sm">Playback Error</p>
                                            <p className="text-gray-500 text-xs text-center max-w-xs">Unable to load this film. Please check your connection and try again.</p>
                                            <button onClick={() => { setVideoError(false); videoRef.current?.load(); videoRef.current?.play().catch(() => {}); }} className="bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all">Try Again</button>
                                            <button onClick={handleGoHome} className="text-gray-600 hover:text-white text-xs uppercase tracking-widest transition-colors">Go Home</button>
                                        </div>
                                    )}
                                    {/* Pause overlay */}
                                    {isPaused && !isEnded && <PauseOverlay movie={movie} isLiked={isLiked} isOnWatchlist={watchlist.includes(movieKey)} onMoreDetails={() => setIsDetailsModalOpen(true)} onSelectActor={setSelectedActor} onResume={() => { videoRef.current?.play(); setIsPaused(false); }} onRewind={() => videoRef.current && (videoRef.current.currentTime -= 10)} onForward={() => videoRef.current && (videoRef.current.currentTime += 10)} onToggleLike={handleToggleLike} onToggleWatchlist={() => toggleWatchlist(movieKey)} onSupport={() => setIsSupportModalOpen(true)} onHome={handleGoHome} />}
                                    {/* End screen */}
                                    {isEnded && (
                                        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.8s_ease-out] bg-black/40 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                                            <div className="max-w-2xl w-full space-y-12">
                                                <div>
                                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-4">Transmission Complete</p>
                                                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">{movie.title}</h2>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-4">Directed by {movie.director}</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
                                                    <button onClick={handleToggleLike} className={`p-8 rounded-[2.5rem] border transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 group ${isLiked ? 'bg-red-600 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 hover:border-red-600/50'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 transition-all ${isLiked ? 'text-white scale-110' : 'text-gray-500 group-hover:text-red-500'} ${isAnimatingLike ? 'animate-heartbeat' : ''}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                        </svg>
                                                        <div><p className="text-base font-black uppercase tracking-tight">{isLiked ? 'Applauded' : 'Applaud Film'}</p></div>
                                                    </button>
                                                    <button onClick={() => setIsSupportModalOpen(true)} className="p-8 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                                                        <span className="text-4xl">💎</span>
                                                        <div><p className="text-base font-black uppercase tracking-tight">Support Creator</p></div>
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
                                </VideoPlayer>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 bg-gray-900">
                             <img src={cardImage(movie.poster)} alt={movie.title} className="w-32 h-auto rounded-lg shadow-xl opacity-50" loading="lazy" />
                             <h2 className="text-3xl font-black uppercase tracking-tighter">Access Locked</h2>
                             <p className="text-gray-400 max-w-md">This selection requires a verified rental or Jury Pass to stream.</p>
                             <button onClick={() => setIsPurchaseModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-xl shadow-2xl transition-all active:scale-95 uppercase text-xs tracking-widest">Unlock Selection // ${movie.salePrice}</button>
                             <button onClick={handleGoHome} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">Return to Home</button>
                        </div>
                    )
                ) : (
                    /* POSTER MODE hero — clean image, lock icon for premium, play circle for accessible */
                    <div
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => hasAccess && isMovieReleased(movie) && setPlayerMode('full')}
                    >
                        {/* Blurred backdrop */}
                        <img src={heroImage(movie.poster)} alt="" role="presentation" className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110" crossOrigin="anonymous" loading="lazy" />
                        {/* Poster */}
                        <img
                            src={movie.poster}
                            alt={movie.title}
                            className={`w-full h-full object-contain relative z-10 ${!hasAccess ? 'opacity-70' : ''}`}
                            crossOrigin="anonymous"
                        />
                        {/* Bottom fade into page */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] to-transparent z-20" />

                        {/* Lock badge for premium — no buttons here, they live below */}
                        {!hasAccess && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center">
                                <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-5 rounded-2xl shadow-2xl border border-amber-400/30">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Play circle for accessible content */}
                        {hasAccess && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 border-2 border-white/30 shadow-2xl">
                                    <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── NETFLIX-STYLE CONTENT PANEL ─────────────────────── */}
            {playerMode !== 'full' && (
                <div className="px-5 pt-4 pb-16 max-w-3xl mx-auto w-full">

                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">
                        {movie.title}
                    </h1>

                    {/* Director */}
                    <p className="text-red-500 font-black uppercase tracking-[0.3em] text-[10px] mb-4">
                        Directed by {movie.director}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-5 text-sm text-gray-400">
                        {movie.releaseDateTime && (
                            <span>{new Date(movie.releaseDateTime).getFullYear()}</span>
                        )}
                        {!!movie.durationInMinutes && (
                            <><span className="text-gray-600">·</span><span>{movie.durationInMinutes}m</span></>
                        )}
                        {movie.genres && (
                            <><span className="text-gray-600">·</span>
                            <span>{Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(' · ') : movie.genres}</span></>
                        )}
                    </div>

                    {/* ── PRIMARY CTA ── */}
                    {hasAccess ? (
                        <button
                            onClick={() => isMovieReleased(movie) ? setPlayerMode('full') : setIsDetailsModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl hover:bg-gray-100 active:scale-95 transition-all mb-3"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                            Play
                        </button>
                    ) : (
                        <>
                            {movie.salePrice && (
                                <p className="text-center text-gray-400 text-sm mb-2">
                                    Unlock for <span className="text-white font-black text-lg">${movie.salePrice}</span>
                                </p>
                            )}
                            <button
                                onClick={() => setIsPurchaseModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all mb-3"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                Unlock Now
                            </button>
                        </>
                    )}

                    {/* Synopsis */}
                    <div
                        className="text-gray-300 text-base leading-relaxed mb-6"
                        dangerouslySetInnerHTML={{ __html: movie.synopsis }}
                    />

                    {/* Cast */}
                    {movie.cast && movie.cast.length > 0 && (
                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Cast</p>
                            <div className="flex flex-wrap gap-2">
                                {movie.cast.map(actor => (
                                    <button
                                        key={actor.name}
                                        onClick={() => setSelectedActor(actor)}
                                        className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold text-[10px] uppercase transition-all"
                                    >
                                        {actor.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <RokuBanner />

                    {/* Deep link — subtle */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <button
                            onClick={() => setIsDeepLinkOpen(true)}
                            className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Deep Link Protocol
                        </button>
                    </div>
                </div>
            )}
        </main>

        {playerMode !== 'full' && <Footer />}
        <BackToTopButton />

        {isDetailsModalOpen && (
            <MovieDetailsModal movie={movie} isLiked={isLiked} onToggleLike={handleToggleLike} onClose={() => setIsDetailsModalOpen(false)} onSelectActor={setSelectedActor} allMovies={allMovies} allCategories={allCategories} onSelectRecommendedMovie={(m) => { setIsDetailsModalOpen(false); window.history.pushState({}, '', `/movie/${m.key}`); window.dispatchEvent(new Event('pushstate')); }} onSupportMovie={() => setIsSupportModalOpen(true)} onPlayMovie={() => { setIsDetailsModalOpen(false); setPlayerMode('full'); }} />
        )}

        {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        {isPurchaseModalOpen && <SquarePaymentModal paymentType="movie" movie={movie} onClose={() => setIsPurchaseModalOpen(false)} onPaymentSuccess={handlePurchaseSuccess} />}
        {isSupportModalOpen && <SquarePaymentModal paymentType="donation" movie={movie} onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={() => setIsSupportModalOpen(false)} />}
        {isDeepLinkOpen && <DeepLinkUtility movieKey={movieKey} onClose={() => setIsDeepLinkOpen(false)} />}
    </div>
  );
};

export default MoviePage;
