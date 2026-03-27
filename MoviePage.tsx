
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import ActorBioModal from './components/ActorBioModal';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import BackToTopButton from './components/BackToTopButton';
import SearchOverlay from './components/SearchOverlay';
import StagingBanner from './components/StagingBanner';
import DirectorCreditsModal from './components/DirectorCreditsModal';
import Countdown from './components/Countdown';
import CastButton from './components/CastButton';
import RokuBanner from './components/RokuBanner';
import SquarePaymentModal from './components/SquarePaymentModal';
import { isMovieReleased } from './constants';
import { useAuth } from './contexts/AuthContext';

declare const google: any;

interface MoviePageProps {
  movieKey: string;
}

const RecommendedMovieLink: React.FC<{ movie: Movie }> = ({ movie }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    return (
        <a
            href={`/movie/${movie.key}`}
            onClick={(e) => handleNavigate(e, `/movie/${movie.key}`)}
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
  const { toggleLikeMovie, likedMovies: likedMoviesArray } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
  const [allCategories, setAllCategories] = useState<Record<string, Category>>({});
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const hasTrackedViewRef = useRef(false);

  const [playerMode, setPlayerMode] = useState<'poster' | 'full'>('poster');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showSupportSuccess, setShowSupportSuccess] = useState(false);

  const isLiked = useMemo(() => likedMoviesArray.includes(movieKey), [likedMoviesArray, movieKey]);

  const playContent = useCallback(() => {
    if (videoRef.current) {
        if (!hasTrackedViewRef.current && movie?.key) {
            hasTrackedViewRef.current = true;
            fetch('/api/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: movie.key }),
            }).catch(() => {});
        }
        videoRef.current.play().catch(e => console.error("Content play failed", e));
    }
  }, [movie?.key]);

  useEffect(() => {
    if (playerMode === 'full' && !hasTrackedViewRef.current) {
        playContent();
    }
  }, [playerMode, playContent]);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const stagingActive = env === 'staging' || stagingSession === 'true';
    if (stagingActive) setIsStaging(true);
    
    const loadMovieData = async () => {
        try {
            const { data: liveData, source } = await fetchAndCacheLiveData({ force: stagingActive });
            setDataSource(source);
            setAllMovies(liveData.movies);
            setAllCategories(liveData.categories);
            const sourceMovie = liveData.movies[movieKey];

            if (sourceMovie) {
              setReleased(isMovieReleased(sourceMovie));
              setMovie({ ...sourceMovie });
              if (params.get('play') === 'true' && sourceMovie.fullMovie && isMovieReleased(sourceMovie)) {
                setPlayerMode('full');
              } else {
                setPlayerMode('poster');
              }
            } else {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new Event('pushstate'));
            }
        } catch (error) {
            console.error("Failed to load movie data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadMovieData();
  }, [movieKey]);

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

  const recommendedMovies = useMemo(() => {
    if (!movie) return [];
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(allCategories).filter((cat: Category) => cat.movieKeys.includes(movie.key));
    currentMovieCategories.forEach((cat: Category) => {
      cat.movieKeys.forEach((key: string) => {
        if (key !== movie.key) recommendedKeys.add(key);
      });
    });
    return Array.from(recommendedKeys).map(key => allMovies[key]).filter(Boolean).slice(0, 7);
  }, [movie, allMovies, allCategories]);

  const handleGoHome = useCallback(() => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('pushstate'));
  }, []);

  const handlePaymentSuccess = () => {
      setShowSupportSuccess(true);
      setTimeout(() => setShowSupportSuccess(false), 3000);
  };

  if (isLoading || !movie) return <LoadingSpinner />;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
        {isStaging && <StagingBanner onExit={() => setIsStaging(false)} isOffline={dataSource === 'fallback'} />}
        {playerMode !== 'full' && <Header searchQuery={searchQuery} onSearch={setSearchQuery} isScrolled={true} onMobileSearchClick={() => setIsMobileSearchOpen(true)} />}

        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-0' : ''}`}>
            <div ref={videoContainerRef} className={`relative w-full ${playerMode === 'full' ? 'aspect-video' : 'min-h-[85vh]'} bg-black secure-video-container group overflow-hidden shadow-2xl`}>
                {playerMode === 'full' && (
                    <video 
                        ref={videoRef} 
                        src={movie.fullMovie} 
                        className={`w-full h-full transition-opacity duration-1000 ${isEnded ? 'opacity-30 blur-md' : 'opacity-100'}`}
                        controls={!isEnded}
                        playsInline
                        autoPlay
                        onContextMenu={(e) => e.preventDefault()} 
                        controlsList="nodownload"
                        onEnded={() => setIsEnded(true)}
                    />
                )}

                {playerMode !== 'full' && (
                    <div className="relative w-full h-full min-h-[85vh] flex items-center">
                         {/* Background Layer */}
                         <div className="absolute inset-0 z-0">
                            <img 
                                src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} 
                                alt="" 
                                className="w-full h-full object-cover opacity-40 blur-sm scale-105" 
                                crossOrigin="anonymous" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                         </div>

                         {/* Content Layer */}
                         <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-20">
                            <div className="lg:col-span-7 space-y-8 animate-[fadeIn_1s_ease-out]">
                                <div className="space-y-2">
                                    <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] animate-[slideIn_0.8s_ease-out]">Directed by {movie.director}</p>
                                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none drop-shadow-2xl">{movie.title}</h1>
                                </div>
                                
                                <div className="max-w-2xl">
                                    <div className="text-gray-300 text-lg md:text-xl leading-relaxed font-medium line-clamp-4 md:line-clamp-none drop-shadow-lg" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <button 
                                        onClick={() => setPlayerMode('full')} 
                                        className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-full font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                        Watch Now
                                    </button>
                                    
                                    <button 
                                        onClick={() => setIsSupportModalOpen(true)}
                                        className="flex items-center gap-3 px-8 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-full hover:bg-white/20 transition-all active:scale-95 uppercase text-xs tracking-widest"
                                    >
                                        <span className="text-xl">💎</span>
                                        Support Filmmaker
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <RokuBanner />
                                </div>
                            </div>

                            {/* Poster/CTA Card Layer */}
                            <div className="hidden lg:block lg:col-span-5 animate-[fadeIn_1.2s_ease-out]">
                                <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 group">
                                    <img 
                                        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} 
                                        alt={movie.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        crossOrigin="anonymous" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                    
                                    <div className="absolute bottom-8 left-8 right-8 p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Talent Involved</p>
                                        <div className="flex flex-wrap gap-2">
                                            {movie.cast.slice(0, 3).map(actor => (
                                                <span key={actor.name} className="text-xs font-bold text-white/80">{actor.name}</span>
                                            ))}
                                            {movie.cast.length > 3 && <span className="text-xs font-bold text-white/40">+{movie.cast.length - 3} More</span>}
                                        </div>
                                        <button 
                                            onClick={() => setPlayerMode('full')}
                                            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-colors text-[10px]"
                                        >
                                            Unlock Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                )}

                {isEnded && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.8s_ease-out]">
                        <div className="max-w-2xl space-y-10">
                            <div>
                                <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-4">Transmission Complete</p>
                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">{movie.title}</h2>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-4">Directed by {movie.director}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => toggleLikeMovie(movieKey)}
                                    className={`p-8 rounded-[2.5rem] border transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 group ${isLiked ? 'bg-red-600 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 hover:border-red-600/50'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${isLiked ? 'text-white' : 'text-gray-500 group-hover:text-red-500'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-lg font-black uppercase tracking-tight">{isLiked ? 'Applauded' : 'Applaud Film'}</p>
                                        <p className="text-[10px] uppercase font-bold opacity-60">Add to your favorites</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setIsSupportModalOpen(true)}
                                    className="p-8 rounded-[2.5rem] bg-purple-600 hover:bg-purple-500 border border-purple-400/30 transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(147,51,234,0.4)]"
                                >
                                    <span className="text-5xl">💎</span>
                                    <div>
                                        <p className="text-lg font-black uppercase tracking-tight">Support Creator</p>
                                        <p className="text-[10px] uppercase font-bold text-purple-200">Help sustain the craft</p>
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

            {playerMode !== 'full' && (
                <div className="max-w-7xl mx-auto p-4 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="md:col-span-2 space-y-12">
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black uppercase tracking-tight border-l-4 border-red-600 pl-4">The Cast</h2>
                                <div className="flex flex-wrap gap-3">
                                    {movie.cast.map(actor => (
                                        <button key={actor.name} onClick={() => setSelectedActor(actor)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-xs hover:bg-red-600 hover:border-red-500 transition-all transform hover:scale-105">{actor.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                             <h2 className="text-2xl font-black uppercase tracking-tight border-l-4 border-red-600 pl-4">Directed By</h2>
                             <p onClick={() => setSelectedDirector(movie.director)} className="text-3xl font-black italic tracking-tighter text-red-500 cursor-pointer hover:text-red-400 transition-colors">{movie.director}</p>
                        </div>
                    </div>

                    {recommendedMovies.length > 0 && (
                        <div className="mt-24 pt-12 border-t border-white/5">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-gray-500 mb-8">More Like This</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
                                {recommendedMovies.map(rec => <RecommendedMovieLink key={rec.key} movie={rec} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>

        {playerMode !== 'full' && <Footer />}
        <BackToTopButton />
        {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        {selectedDirector && <DirectorCreditsModal directorName={selectedDirector} onClose={() => setSelectedDirector(null)} allMovies={allMovies} onSelectMovie={handleGoHome} />}
        {isSupportModalOpen && <SquarePaymentModal movie={movie} paymentType="donation" onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={handlePaymentSuccess} />}
    </div>
  );
};

export default MoviePage;
