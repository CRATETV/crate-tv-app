
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';
import StagingBanner from './StagingBanner';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import CastButton from './CastButton';
import RokuBanner from './RokuBanner';
import SquarePaymentModal from './SquarePaymentModal';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';

declare const google: any;

interface MoviePageProps {
  movieKey: string;
}

type PlayerMode = 'poster' | 'full';

const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
  let element = document.querySelector(`meta[${attr}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

// Helper to extract Vimeo ID and return embed URL
const getVimeoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const match = url.match(vimeoRegex);
    if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1&color=ff0000&title=0&byline=0&portrait=0`;
    }
    return null;
};

const RecommendedMovieLink: React.FC<{ movie: Movie }> = ({ movie }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    return (
        <a
            href={`/movie/${movie.key}?play=true`}
            onClick={(e) => handleNavigate(e, `/movie/${movie.key}?play=true`)}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 bg-gray-900"
        >
              <img 
                  src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                  alt={movie.title} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
                  crossOrigin="anonymous"
              />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </a>
    );
}

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user, likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist } = useAuth();
  const { isLoading: isDataLoading, movies: allMovies, categories: allCategories, dataSource } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  
  const recommendedMovies = useMemo(() => {
    if (!movie || !movie.key) return [];
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(allCategories).filter((cat: Category) => cat && Array.isArray(cat.movieKeys) && cat.movieKeys.includes(movie.key));
    currentMovieCategories.forEach((cat: Category) => { cat.movieKeys.forEach((key: string) => { if (key !== movie.key) recommendedKeys.add(key); }); });
    return Array.from(recommendedKeys).map(key => allMovies[key]).filter((m): m is Movie => !!m).slice(0, 7);
  }, [movie, allMovies, allCategories]);

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const hasTrackedViewRef = useRef(false);

  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [released, setReleased] = useState(() => isMovieReleased(movie));
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showSupportSuccess, setShowSupportSuccess] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

  const isLiked = useMemo(() => likedMoviesArray.includes(movieKey), [likedMoviesArray, movieKey]);
  const isOnWatchlist = useMemo(() => watchlist.includes(movieKey), [watchlist, movieKey]);

  const vimeoEmbedUrl = useMemo(() => movie ? getVimeoEmbedUrl(movie.fullMovie) : null, [movie]);

  const synopsisText = movie?.synopsis || '';
  const synopsisIsLong = synopsisText.replace(/<[^>]+>/g, '').length > 200;

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  };

  const handlePaymentSuccess = () => {
    setShowSupportSuccess(true);
    setTimeout(() => setShowSupportSuccess(false), 3000);
  };

  const playContent = useCallback(async () => {
    setIsAdPlaying(false);
    if (videoRef.current) {
        if (!hasTrackedViewRef.current && movie?.key) {
            hasTrackedViewRef.current = true;
            const token = await getUserIdToken();
            if (token) {
                fetch('/api/track-view', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ movieKey: movie.key }),
                }).catch(err => console.error("Failed to track view:", err));
            }
        }
        videoRef.current.play().catch(e => console.error("Content play failed", e));
    }
  }, [movie?.key, getUserIdToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (movie) {
        setReleased(isMovieReleased(movie));
        if ((params.get('play') === 'true') && movie.fullMovie && isMovieReleased(movie)) {
            setPlayerMode('full');
            // If it's not a vimeo link, we track view here
            if (!getVimeoEmbedUrl(movie.fullMovie)) {
                playContent();
            }
        } else {
            setPlayerMode('poster');
        }
    } 
  }, [movieKey, movie, isDataLoading, playContent]);

  if (isDataLoading || !movie) return <LoadingSpinner />;

  return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            {isStaging && <StagingBanner onExit={() => {}} isOffline={dataSource === 'fallback'} />}
            
            {playerMode !== 'full' && (
                <Header
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    isScrolled={true}
                    onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                    onSearchSubmit={(q) => { if(q) window.location.href = `/?search=${encodeURIComponent(q)}`; }}
                />
            )}

            <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
                <div ref={videoContainerRef} className="relative w-full aspect-video bg-black secure-video-container group/player">
                    <div ref={adContainerRef} className="absolute inset-0 z-20 pointer-events-none" />
                    
                    {playerMode === 'full' && (
                        <>
                            {vimeoEmbedUrl ? (
                                <iframe
                                    src={vimeoEmbedUrl}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    title={movie.title}
                                ></iframe>
                            ) : (
                                <>
                                    <video 
                                        ref={videoRef} 
                                        src={movie.fullMovie} 
                                        className="w-full h-full"
                                        controls={!isAdPlaying && !isPaused}
                                        playsInline
                                        onContextMenu={(e) => e.preventDefault()} 
                                        controlsList="nodownload"
                                        onEnded={() => handleGoHome()}
                                        onPause={() => setIsPaused(true)}
                                        onPlay={() => setIsPaused(false)}
                                    />
                                    {isPaused && !isAdPlaying && (
                                        <PauseOverlay 
                                            movie={movie}
                                            isLiked={isLiked}
                                            isOnWatchlist={isOnWatchlist}
                                            onMoreDetails={() => setIsDetailsModalOpen(true)}
                                            onSelectActor={setSelectedActor}
                                            onResume={() => videoRef.current?.play()}
                                            onRewind={() => { if(videoRef.current) videoRef.current.currentTime -= 10; }}
                                            onForward={() => { if(videoRef.current) videoRef.current.currentTime += 10; }}
                                            onToggleLike={() => toggleLikeMovie(movieKey)}
                                            onToggleWatchlist={() => toggleWatchlist(movieKey)}
                                            onSupport={() => setIsSupportModalOpen(true)}
                                            onHome={handleGoHome}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {playerMode !== 'full' && (
                        <>
                            {/* Mobile Floating Back Button */}
                            <button 
                                onClick={handleGoHome} 
                                className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2.5 hover:bg-white/10 transition-all shadow-2xl active:scale-95"
                                aria-label="Back to browse"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>

                            <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20" onContextMenu={(e) => e.preventDefault()} crossOrigin="anonymous" />
                            
                            <div className="relative w-full h-full flex items-center justify-center p-8 md:p-0">
                                <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt={movie.title} className="w-full h-full object-contain md:max-w-2xl rounded-lg shadow-2xl" onContextMenu={(e) => e.preventDefault()} crossOrigin="anonymous" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
                                {released && (
                                    <button 
                                        onClick={() => setPlayerMode('full')}
                                        className="absolute group/playbtn text-white bg-black/40 backdrop-blur-md rounded-full p-6 hover:bg-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl border-4 border-white/30"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 group-hover/playbtn:text-black transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {playerMode !== 'full' && (
                  <div className="max-w-4xl mx-auto p-6 md:p-12 -mt-8 relative z-30">
                      <h1 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter">{movie.title || 'Untitled Film'}</h1>
                      
                      <div className="flex flex-wrap items-center gap-4 mb-10">
                          <button 
                            onClick={() => setIsSupportModalOpen(true)} 
                            className="flex-1 sm:flex-none flex items-center justify-center px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                             </svg>
                             Support Filmmaker
                          </button>
                          <button 
                            onClick={() => setIsDetailsModalOpen(true)} 
                            className="flex-1 sm:flex-none flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-xl border border-white/10"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             More Info
                          </button>
                          {showSupportSuccess && (
                            <div className="bg-green-500/80 text-white font-bold py-2 px-4 rounded-md inline-block animate-[fadeIn_0.5s_ease-out]">
                                Thank you for your support!
                            </div>
                          )}
                      </div>

                      <div className="relative mb-12">
                          <div className={`text-gray-300 text-lg md:text-xl leading-relaxed ${!isSynopsisExpanded && synopsisIsLong ? 'line-clamp-4' : ''}`} dangerouslySetInnerHTML={{ __html: synopsisText }}></div>
                          {synopsisIsLong && !isSynopsisExpanded && (
                              <button onClick={() => setIsSynopsisExpanded(true)} className="text-white font-bold mt-4 hover:underline">Read more</button>
                          )}
                      </div>
                       
                      <RokuBanner />

                      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                               <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Starring</h3>
                               <div className="grid grid-cols-2 gap-4">
                                  {movie.cast.map((actor: Actor) => (
                                  <button key={actor.name} className="text-left py-2 px-3 rounded-lg hover:bg-white/5 text-white font-bold transition-all" onClick={() => setSelectedActor(actor)}>
                                      {actor.name}
                                  </button>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Behind the lens</h3>
                              <div className="space-y-4">
                                  <div>
                                      <p className="text-xs font-bold text-gray-400 mb-1">Director</p>
                                      {movie.director.split(',').map((d: string) => (
                                          <button key={d} className="block text-white font-bold hover:text-red-500 transition-colors mb-1" onClick={() => setSelectedDirector(d.trim())}>{d.trim()}</button>
                                      ))}
                                  </div>
                                  {movie.durationInMinutes ? (
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 mb-1">Runtime</p>
                                        <p className="text-white font-bold">{movie.durationInMinutes}m</p>
                                    </div>
                                  ) : null}
                              </div>
                          </div>
                      </div>

                      {recommendedMovies.length > 0 && (
                          <div className="mt-20 pt-12 border-t border-white/5">
                              <h2 className="text-2xl font-black text-white mb-8">You might also like</h2>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                  {recommendedMovies.map(recMovie => (
                                      <RecommendedMovieLink key={recMovie.key} movie={recMovie} />
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                )}
            </main>
            
            {playerMode !== 'full' && (
              <>
                <Footer />
                <BackToTopButton />
              </>
            )}

            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
             {selectedDirector && (
                <DirectorCreditsModal
                    directorName={selectedDirector}
                    onClose={() => setSelectedDirector(null)}
                    allMovies={allMovies}
                    onSelectMovie={(m) => { window.history.pushState({}, '', `/movie/${m.key}`); window.dispatchEvent(new Event('pushstate')); window.scrollTo(0, 0); }}
                />
            )}
            {isSupportModalOpen && movie && (
                <SquarePaymentModal
                    movie={movie}
                    paymentType="donation"
                    onClose={() => setIsSupportModalOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
            {isDetailsModalOpen && movie && (
                <MovieDetailsModal
                    movie={movie}
                    isLiked={isLiked}
                    onToggleLike={toggleLikeMovie}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onSelectActor={setSelectedActor}
                    allMovies={allMovies}
                    allCategories={allCategories}
                    onSelectRecommendedMovie={(m) => { setIsDetailsModalOpen(false); window.history.pushState({}, '', `/movie/${m.key}`); window.dispatchEvent(new Event('pushstate')); }}
                    onSupportMovie={() => { setIsDetailsModalOpen(false); setIsSupportModalOpen(true); }}
                />
            )}
        </div>
    );
};

export default MoviePage;
