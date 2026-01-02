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

// Security Component: The "Ghost" Identity Overlay
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
  const [playerMode, setPlayerMode] = useState<'poster' | 'full'>('poster');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTrackedViewRef = useRef(false);
  const securityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SECURITY: Deterrant Reveal Protocol
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

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && playerMode === 'full') {
            triggerSecurity();
        }
    };

    window.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
        window.removeEventListener('keydown', handleKeydown, true);
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
        }
    }
  }, [movie, hasAccess]);

  const handleGoHome = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  }, []);

  const playContent = useCallback(async () => {
    if (videoRef.current && !hasTrackedViewRef.current && movie?.key) {
        try {
            if (containerRef.current?.requestFullscreen) {
                await containerRef.current.requestFullscreen();
            }
        } catch (e) {}

        hasTrackedViewRef.current = true;
        const token = await getUserIdToken();
        if (token) {
            fetch('/api/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ movieKey: movie.key }),
            }).catch(e => {});
        }
        videoRef.current.play().catch(e => {});
    }
  }, [movie, getUserIdToken]);

  useEffect(() => {
      if (playerMode === 'full' && videoRef.current && hasAccess) playContent();
  }, [playerMode, hasAccess, playContent]);

  if (isDataLoading) return <LoadingSpinner />;
  if (!movie) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-800 bg-black">Content Restricted</div>;

  const embedUrl = getEmbedUrl(movie.fullMovie);
  const seoDescription = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#050505] text-white">
        <SEO title={movie.title} description={seoDescription} image={movie.poster} type="video.movie" />
        {playerMode !== 'full' && <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} />}
        
        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
            <div className={`relative w-full ${playerMode === 'full' ? 'h-screen' : 'aspect-video'} bg-black shadow-2xl overflow-hidden secure-video-container`} onContextMenu={(e) => e.preventDefault()}>
                {playerMode === 'full' ? (
                    hasAccess ? (
                        embedUrl ? (
                            <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
                        ) : (
                            <div className="relative w-full h-full">
                                {user?.email && <SecureWatermark email={user.email} isTriggered={isSecurityTriggered} />}

                                <video 
                                    ref={videoRef} 
                                    src={movie.fullMovie} 
                                    className="w-full h-full object-contain" 
                                    controls={!isPaused} 
                                    playsInline 
                                    autoPlay 
                                    onPause={() => setIsPaused(true)} 
                                    onPlay={() => setIsPaused(false)}
                                    controlsList="nodownload" 
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                                
                                {isPaused && (
                                    <PauseOverlay 
                                        movie={movie} 
                                        isLiked={likedMoviesArray.includes(movieKey)} 
                                        isOnWatchlist={watchlist.includes(movieKey)} 
                                        onMoreDetails={() => setIsDetailsModalOpen(true)} 
                                        onSelectActor={setSelectedActor} 
                                        onResume={() => videoRef.current?.play()} 
                                        onRewind={() => videoRef.current && (videoRef.current.currentTime -= 10)} 
                                        onForward={() => videoRef.current && (videoRef.current.currentTime += 10)} 
                                        onToggleLike={() => toggleLikeMovie(movieKey)} 
                                        onToggleWatchlist={() => toggleWatchlist(movieKey)} 
                                        onSupport={() => setIsSupportModalOpen(true)} 
                                        onHome={handleGoHome} 
                                    />
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
                         <button onClick={() => hasAccess ? setPlayerMode('full') : setIsPurchaseModalOpen(true)} className="absolute bg-white/10 backdrop-blur-md rounded-full p-8 border-4 border-white/20 hover:scale-110 transition-all shadow-2xl group">
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
                            <button onClick={() => setIsSupportModalOpen(true)} className="flex-1 md:flex-none bg-purple-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-purple-700 transition-all active:scale-95">Support Creator</button>
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
        {isDetailsModalOpen && <MovieDetailsModal movie={movie} isLiked={likedMoviesArray.includes(movieKey)} onToggleLike={toggleLikeMovie} onClose={() => setIsDetailsModalOpen(false)} onSelectActor={setSelectedActor} allMovies={allMovies} allCategories={allCategories} onSelectRecommendedMovie={(m) => window.location.href = `/movie/${m.key}`} onSupportMovie={() => setIsSupportModalOpen(true)} />}
        {isPurchaseModalOpen && <SquarePaymentModal movie={movie} paymentType="movie" onClose={() => setIsPurchaseModalOpen(false)} onPaymentSuccess={() => window.location.reload()} />}
        {isSupportModalOpen && <SquarePaymentModal movie={movie} paymentType="donation" onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={() => alert('Support recorded.')} />}
    </div>
  );
};

export default MoviePage;