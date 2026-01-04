
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

        <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
            <div ref={videoContainerRef} className="relative w-full aspect-video bg-black secure-video-container group overflow-hidden shadow-2xl">
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
                    <div className="relative w-full h-full flex items-center justify-center">
                         <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30" crossOrigin="anonymous" />
                         <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt={movie.title} className="w-full h-full object-contain relative z-10" crossOrigin="anonymous" />
                         <button onClick={() => setPlayerMode('full')} className="absolute z-20 bg-white/10 backdrop-blur-md rounded-full p-8 border-2 border-white/20 hover:scale-110 transition-all shadow-2xl group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white group-hover:text-red-600 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                         </button>
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
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter">{movie.title}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <button onClick={() => setIsSupportModalOpen(true)} className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-all active:scale-95 uppercase text-xs tracking-widest animate-[pulse_3s_infinite]">
                           Support Filmmaker
                        </button>
                        {showSupportSuccess && <div className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg animate-fadeIn">Thank you for your support!</div>}
                    </div>
                    <div className="mt-8 text-gray-300 text-lg leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></div>
                    <RokuBanner />
                    
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="md:col-span-2 space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight">The Cast</h2>
                            <div className="flex flex-wrap gap-3">
                                {movie.cast.map(actor => (
                                    <button key={actor.name} onClick={() => setSelectedActor(actor)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white font-bold text-xs hover:bg-red-600 transition-all">{actor.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                             <h2 className="text-2xl font-black uppercase tracking-tight">Directed By</h2>
                             <p onClick={() => setSelectedDirector(movie.director)} className="text-xl font-bold text-red-500 cursor-pointer hover:text-red-400 transition-colors">{movie.director}</p>
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
