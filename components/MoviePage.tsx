import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
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
import DonationSuccessModal from './DonationSuccessModal';
import { isMovieReleased } from '../constants';

declare const google: any; // Declare Google IMA SDK global

interface MoviePageProps {
  movieKey: string;
}

type PlayerMode = 'poster' | 'full';

// Helper function to create/update meta tags
const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
  let element = document.querySelector(`meta[${attr}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

// A self-contained component for displaying a recommended movie.
const RecommendedMovieLink: React.FC<{ movie: Movie }> = ({ movie }) => {
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0); // Scroll to top for a new page feel
    };

    return (
        <a
            href={`/movie/${movie.key}`}
            onClick={(e) => handleNavigate(e, `/movie/${movie.key}`)}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 bg-gray-900"
        >
              <img 
                  src={movie.poster} 
                  alt={movie.title} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
              />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </a>
    );
}

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
  const [allCategories, setAllCategories] = useState<Record<string, Category>>({});
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasTrackedViewRef = useRef(false);

  // Like state
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  
  // Player state
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Staging and feature toggles
  const [isStaging, setIsStaging] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
  
  // Payment Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isDonationSuccessModalOpen, setIsDonationSuccessModalOpen] = useState(false);
  const [lastDonationDetails, setLastDonationDetails] = useState<{amount: number; email?: string} | null>(null);

  // Ad State
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsManagerRef = useRef<any>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  const playContent = useCallback(() => {
    setIsAdPlaying(false);
    if (videoRef.current) {
        if (!hasTrackedViewRef.current && movie?.key) {
            hasTrackedViewRef.current = true;
            fetch('/api/track-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: movie.key }),
            }).catch(err => console.error("Failed to track view:", err));
        }
        videoRef.current.play().catch(e => console.error("Content play failed", e));
    }
  }, [videoRef, movie?.key]);
  
  const initializeAds = useCallback(() => {
    if (!videoRef.current || !adContainerRef.current || playerMode !== 'full' || !released || adsManagerRef.current || typeof google === 'undefined') {
        if (playerMode === 'full') playContent(); // Play content directly if ads can't be initialized
        return;
    }
    
    const videoElement = videoRef.current;
    const adContainer = adContainerRef.current;
    setIsAdPlaying(true);
    setAdError(null);

    const adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
    const adsLoader = new google.ima.AdsLoader(adDisplayContainer);

    adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (adsManagerLoadedEvent: any) => {
            const adsManager = adsManagerLoadedEvent.getAdsManager(videoElement);
            adsManagerRef.current = adsManager;

            adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => videoElement.pause());
            adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, playContent);
            adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, playContent);
            adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent: any) => {
                console.error('Ad Error:', adErrorEvent.getError());
                setAdError('An ad could not be loaded. Starting film...');
                playContent();
            });
            
            try {
                adsManager.init(videoElement.clientWidth, videoElement.clientHeight, google.ima.ViewMode.NORMAL);
                adsManager.start();
            } catch (adError) {
                console.error("AdsManager could not be started", adError);
                playContent();
            }
        },
        false
    );
    
    adsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR,
        (adErrorEvent: any) => {
            console.error('Ad Loader Error:', adErrorEvent.getError());
            setAdError('An ad could not be loaded. Starting film...');
            playContent();
        },
        false
    );

    const adsRequest = new google.ima.AdsRequest();
    // Using a sample skippable pre-roll tag. This would come from AdSense.
    adsRequest.adTagUrl = 'https://storage.googleapis.com/interactive-media-ads/ad-tags/unknown/vast_skippable.xml';
    adsRequest.linearAdSlotWidth = videoElement.clientWidth;
    adsRequest.linearAdSlotHeight = videoElement.clientHeight;

    adsLoader.requestAds(adsRequest);
  }, [playerMode, released, playContent]);
  
  useEffect(() => {
    return () => {
        if (adsManagerRef.current) {
            adsManagerRef.current.destroy();
            adsManagerRef.current = null;
        }
    };
  }, []);

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
    
              const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
              if (storedLikedMovies) setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
    
              setMovie({ ...sourceMovie });
    
              if (params.get('play') === 'true' && sourceMovie.fullMovie && isMovieReleased(sourceMovie)) {
                setPlayerMode('full');
              } else {
                setPlayerMode('poster');
              }
            } else {
              window.location.href = '/';
            }
        } catch (error) {
            console.error("Failed to load movie data:", error);
            window.location.href = '/';
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
  
  useEffect(() => {
    if (playerMode === 'full' && released) {
        const timer = setTimeout(() => initializeAds(), 100);
        return () => clearTimeout(timer);
    } else {
        if (adsManagerRef.current) {
            adsManagerRef.current.destroy();
            adsManagerRef.current = null;
        }
        setIsAdPlaying(false);
    }
  }, [playerMode, released, initializeAds]);

  // SEO
  useEffect(() => {
    if (movie) {
        document.title = `${movie.title || 'Untitled Film'} | Crate TV`;
        const synopsisText = (movie.synopsis || '').replace(/<br\s*\/?>/gi, ' ').trim();
        const pageUrl = window.location.href;
        setMetaTag('property', 'og:title', movie.title || 'Crate TV Film');
        setMetaTag('name', 'description', synopsisText);
        setMetaTag('property', 'og:description', synopsisText);
        setMetaTag('property', 'og:image', movie.poster || '');
        setMetaTag('property', 'og:url', pageUrl);
        setMetaTag('property', 'og:type', 'video.movie');
    }
 }, [movie]);

 useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && playerMode === 'full') handleExitPlayer();
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
}, [playerMode]);


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
      
    const exitStaging = () => {
        sessionStorage.removeItem('crateTvStaging');
        const params = new URLSearchParams(window.location.search);
        params.delete('env');
        window.location.search = params.toString();
    };

    const handleSearchSubmit = (query: string) => {
        if (query) window.location.href = `/?search=${encodeURIComponent(query)}`;
    };
    
    const handleMovieEnd = () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('pushstate'));
    };

    const handleExitPlayer = () => {
        setPlayerMode('poster');
    };
    
    const handleDonationSuccess = (details: { amount: number; email?: string }) => {
        setIsSupportModalOpen(false);
        setLastDonationDetails(details);
        setIsDonationSuccessModalOpen(true);
    };

    if (isLoading || !movie) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
            
            {playerMode !== 'full' && (
                <Header
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    isScrolled={true}
                    onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                    onSearchSubmit={handleSearchSubmit}
                    isStaging={isStaging}
                />
            )}

            <main className={`flex-grow ${playerMode !== 'full' ? 'pt-16' : ''}`}>
                <div ref={videoContainerRef} className="relative w-full aspect-video bg-black secure-video-container">
                    <div ref={adContainerRef} className="absolute inset-0 z-20 pointer-events-none" />
                    
                    {playerMode === 'full' && (
                        <video 
                            ref={videoRef} 
                            src={movie.fullMovie} 
                            className="w-full h-full"
                            controls={!isAdPlaying}
                            playsInline
                            onContextMenu={(e) => e.preventDefault()} 
                            controlsList="nodownload"
                            onEnded={handleMovieEnd}
                        />
                    )}

                    {playerMode !== 'full' && (
                        <>
                            <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30" onContextMenu={(e) => e.preventDefault()} />
                            
                            {released ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-contain" onContextMenu={(e) => e.preventDefault()} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <button 
                                        onClick={() => setPlayerMode('full')}
                                        className="absolute text-white bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
                                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Coming Soon</h2>
                                    {movie.releaseDateTime && (
                                        <div className="bg-black/50 rounded-lg p-4">
                                            <Countdown 
                                                targetDate={movie.releaseDateTime} 
                                                onEnd={() => setReleased(true)} 
                                                className="text-xl md:text-3xl text-white" 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    
                    {playerMode === 'full' && <CastButton videoElement={videoRef.current} />}
                    {playerMode === 'full' && (
                        <button
                            onClick={handleExitPlayer}
                            className="absolute top-4 right-16 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors text-white z-30"
                            aria-label="Exit video player"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {playerMode !== 'full' && (
                  <div className="max-w-6xl mx-auto p-4 md:p-8">
                      <h1 className="text-3xl md:text-5xl font-bold text-white">{movie.title || 'Untitled Film'}</h1>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                          <button onClick={() => setIsSupportModalOpen(true)} className="flex items-center justify-center px-4 py-2 bg-purple-600/80 text-white font-bold rounded-md hover:bg-purple-700/80 transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" /></svg>
                             Support Filmmaker
                          </button>
                      </div>
                      <div className="mt-4 text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}></div>
                       
                      <RokuBanner />

                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="md:col-span-2">
                               <div className="mt-6 bg-gradient-to-r from-red-500/10 to-blue-500/10 p-3 rounded-lg text-center border border-gray-700">
                                  <p className="text-sm text-white">✨ Click an actor's name for their bio & an AI-generated fun fact!</p>
                              </div>
                          </div>
                          <div>
                               {movie.durationInMinutes && movie.durationInMinutes > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-400 mb-1">Duration</h3>
                                    <p className="text-white">{movie.durationInMinutes} minutes</p>
                                </div>
                              )}
                               <h3 className="text-lg font-semibold text-gray-400 mb-2">Cast</h3>
                              <div className="space-y-2 text-white">
                                  {movie.cast.map((actor: Actor) => (
                                  <p key={actor.name} className="group cursor-pointer" onClick={() => setSelectedActor(actor)}>
                                      <span className="group-hover:text-red-400 transition">{actor.name}</span>
                                  </p>
                                  ))}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2">Director</h3>
                              <div className="space-y-2 text-white">
                                  {movie.director.split(',').map((directorName: string) => directorName.trim()).filter(Boolean).map(directorName => (
                                      <p key={directorName} className="group cursor-pointer" onClick={() => setSelectedDirector(directorName)}>
                                          <span className="group-hover:text-red-400 transition">{directorName}</span>
                                      </p>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {recommendedMovies.length > 0 && (
                          <div className="mt-12 pt-8 border-t border-gray-700">
                              <h2 className="text-2xl font-bold text-white mb-4">More Like This</h2>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
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

            {selectedActor && (
                <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />
            )}
             {selectedDirector && (
                <DirectorCreditsModal
                    directorName={selectedDirector}
                    onClose={() => setSelectedDirector(null)}
                    allMovies={allMovies}
                    onSelectMovie={(m: Movie) => {
                         const path = `/movie/${m.key}`;
                         window.history.pushState({}, '', path);
                         window.dispatchEvent(new Event('pushstate'));
                         window.scrollTo(0, 0);
                    }}
                />
            )}
            {isMobileSearchOpen && (
                <SearchOverlay
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    onClose={() => setIsMobileSearchOpen(false)}
                    onSubmit={handleSearchSubmit}
                />
            )}
            {isSupportModalOpen && movie && (
                <SquarePaymentModal
                    movie={movie}
                    paymentType="donation"
                    onClose={() => setIsSupportModalOpen(false)}
                    onPaymentSuccess={handleDonationSuccess}
                />
            )}
            {isDonationSuccessModalOpen && lastDonationDetails && movie && (
                <DonationSuccessModal
                    movieTitle={movie.title}
                    directorName={movie.director}
                    amount={lastDonationDetails.amount}
                    email={lastDonationDetails.email}
                    onClose={() => setIsDonationSuccessModalOpen(false)}
                />
            )}
        </div>
    );
};

export default MoviePage;