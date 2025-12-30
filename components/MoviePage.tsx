import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import RokuBanner from './RokuBanner';
import SquarePaymentModal from './SquarePaymentModal';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';
import DirectorCreditsModal from './DirectorCreditsModal';

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

const PostPlayOverlay: React.FC<{ movies: Movie[]; onSelect: (movie: Movie) => void; onHome: () => void; }> = ({ movies, onSelect, onHome }) => {
    const [countdown, setCountdown] = useState(15);
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timer); onHome(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onHome]);
    return (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="max-w-5xl w-full text-center">
                <p className="text-red-500 font-black uppercase tracking-[0.3em] mb-2 text-sm">Thanks for watching</p>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-10">What's Next?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-12">
                    {movies.slice(0, 6).map(m => (
                        <button key={m.key} onClick={() => onSelect(m)} className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 hover:border-red-500 transition-all hover:scale-105 shadow-2xl">
                            <img src={m.poster} alt={m.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                        </button>
                    ))}
                </div>
                <button onClick={onHome} className="px-8 py-3 bg-white text-black font-black rounded-full hover:bg-red-600 transition-all">Back to Feed ({countdown}s)</button>
            </div>
        </div>
    );
};

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist, rentals, purchaseMovie } = useAuth();
  const { movies: allMovies, categories: allCategories, isLoading: isDataLoading } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  const [playerMode, setPlayerMode] = useState<'poster' | 'full'>('poster');
  const [isPaused, setIsPaused] = useState(false);
  const [showPostPlay, setShowPostPlay] = useState(false);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTrackedViewRef = useRef(false);

  const canCollectDonations = useMemo(() => {
    if (!movie) return false;
    const isVintage = allCategories.publicDomainIndie?.movieKeys?.includes(movie.key);
    const isCopyrightRestricted = movie.hasCopyrightMusic === true;
    const isManualDisabled = movie.isSupportEnabled === false;
    return !isVintage && !isCopyrightRestricted && !isManualDisabled && !movie.isForSale;
  }, [movie, allCategories]);

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
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  }, []);

  const handleMovieEnd = useCallback(() => setShowPostPlay(true), []);

  const playContent = useCallback(async () => {
    if (videoRef.current && !hasTrackedViewRef.current && movie?.key) {
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
  if (!movie) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-800">Film Missing from Cluster</div>;

  const embedUrl = getEmbedUrl(movie.fullMovie);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
        {playerMode !== 'full' && <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} />}
        
        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
            <div className="relative w-full aspect-video bg-black shadow-2xl overflow-hidden">
                {showPostPlay && <PostPlayOverlay movies={Object.values(allMovies).slice(0, 10)} onSelect={(m) => window.location.href = `/movie/${m.key}?play=true`} onHome={handleGoHome} />}
                
                {playerMode === 'full' ? (
                    hasAccess ? (
                        embedUrl ? (
                            <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
                        ) : (
                            <>
                                <video ref={videoRef} src={movie.fullMovie} className="w-full h-full" controls={!isPaused} playsInline autoPlay onEnded={handleMovieEnd} onPause={() => setIsPaused(true)} onPlay={() => setIsPaused(false)} />
                                {isPaused && <PauseOverlay movie={movie} isLiked={likedMoviesArray.includes(movieKey)} isOnWatchlist={watchlist.includes(movieKey)} onMoreDetails={() => setIsDetailsModalOpen(true)} onSelectActor={setSelectedActor} onResume={() => videoRef.current?.play()} onRewind={() => videoRef.current && (videoRef.current.currentTime -= 10)} onForward={() => videoRef.current && (videoRef.current.currentTime += 10)} onToggleLike={() => toggleLikeMovie(movieKey)} onToggleWatchlist={() => toggleWatchlist(movieKey)} onSupport={() => setIsSupportModalOpen(true)} onHome={handleGoHome} />}
                            </>
                        )
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/90">
                            <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Rental Required</h2>
                            <button onClick={() => setIsPurchaseModalOpen(true)} className="px-10 py-4 bg-green-600 text-white font-black rounded-xl">Rent Film - ${movie.salePrice?.toFixed(2)}</button>
                        </div>
                    )
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                         <img src={movie.poster} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20" />
                         <img src={movie.poster} className="relative w-full h-full object-contain max-w-2xl rounded-lg shadow-2xl" />
                         <button onClick={() => hasAccess ? setPlayerMode('full') : setIsPurchaseModalOpen(true)} className="absolute bg-white/10 backdrop-blur-md rounded-full p-8 border-4 border-white/20 hover:scale-110 transition-all">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                         </button>
                    </div>
                )}
            </div>

            {playerMode !== 'full' && (
                <div className="max-w-4xl mx-auto p-10 md:p-14 space-y-10">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase">{movie.title}</h1>
                    <div className="flex gap-4">
                        {canCollectDonations && <button onClick={() => setIsSupportModalOpen(true)} className="bg-purple-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm">Support Creator</button>}
                        <button onClick={() => setIsDetailsModalOpen(true)} className="bg-white/10 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm border border-white/10">Full Credits</button>
                    </div>
                    <div className="text-gray-300 text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                    <RokuBanner />
                </div>
            )}
        </main>
        
        {playerMode !== 'full' && <Footer />}
        <BackToTopButton />
        
        {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        {isDetailsModalOpen && <MovieDetailsModal movie={movie} isLiked={likedMoviesArray.includes(movieKey)} onToggleLike={toggleLikeMovie} onClose={() => setIsDetailsModalOpen(false)} onSelectActor={setSelectedActor} allMovies={allMovies} allCategories={allCategories} onSelectRecommendedMovie={(m) => window.location.href = `/movie/${m.key}`} onSupportMovie={() => setIsSupportModalOpen(true)} />}
        {isPurchaseModalOpen && <SquarePaymentModal movie={movie} paymentType="movie" onClose={() => setIsPurchaseModalOpen(false)} onPaymentSuccess={() => window.location.reload()} />}
        {isSupportModalOpen && <SquarePaymentModal movie={movie} paymentType="donation" onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={() => alert('Support recorded. Thank you.')} />}
    </div>
  );
};

export default MoviePage;