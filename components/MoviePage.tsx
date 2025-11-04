import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import Header from './Header';
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
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';


declare const google: any; // Declare Google IMA SDK global

interface MoviePageProps {
  movieKey: string;
}

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
  const { user } = useAuth();
  const { isLoading: isDataLoading, movies: allMovies, categories: allCategories, dataSource } = useFestival();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState(false);
  const hasTrackedViewRef = useRef(false);
  
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

  // Player state - Simplified
  const [shouldPlay, setShouldPlay] = useState(
    new URLSearchParams(window.location.search).get('play') === 'true'
  );
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Search and URL state
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Staging and feature toggles
  const [isStaging, setIsStaging] = useState(false);
  
  // Payment Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isDonationSuccessModalOpen, setIsDonationSuccessModalOpen] = useState(false);
  const [lastDonationDetails, setLastDonationDetails] = useState<{amount: number; email?: string} | null>(null);

  // Ad State
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsLoaderRef = useRef<any>(null);
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
    if (!videoRef.current || !adContainerRef.current || !released || adsManagerRef.current || typeof google === 'undefined') {
        playContent();
        return;
    }
    
    const videoElement = videoRef.current;
    const adContainer = adContainerRef.current;
    setIsAdPlaying(true);
    setAdError(null);

    const adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
    const adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    adsLoaderRef.current = adsLoader;

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
    adsRequest.adTagUrl = 'https://googleads.g.doubleclick.net/pagead/ads?ad_type=video&client=ca-video-pub-5748304047766155&videoad_start_delay=0&description_url=' + encodeURIComponent(window.location.href);
    adsRequest.linearAdSlotWidth = videoElement.clientWidth;
    adsRequest.linearAdSlotHeight = videoElement.clientHeight;

    adsLoader.requestAds(adsRequest);
  }, [released, playContent]);
  
  useEffect(() => {
    return () => {
        if (adsManagerRef.current) {
            adsManagerRef.current.destroy();
            adsManagerRef.current = null;
        }
    };
  }, []);

  // Effect to load component state from context/storage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const stagingActive = env === 'staging' || stagingSession === 'true';
    if (stagingActive) setIsStaging(true);
    
    const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
    if (storedLikedMovies) {
      setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
    }
  }, []);
  
  // Effect to set the current movie based on movieKey and context data
  useEffect(() => {
      const sourceMovie = allMovies[movieKey];
      if (sourceMovie) {
          setMovie(sourceMovie);
          setReleased(isMovieReleased(sourceMovie));
      } else if (!isDataLoading) {
          // If data has loaded and movie is not found, redirect
          window.history.replaceState({}, '', '/');
          window.dispatchEvent(new Event('pushstate'));
      }
  }, [movieKey, allMovies, isDataLoading]);


  useEffect(() => {
    try {
      localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(likedMovies)));
    } catch (e) {
      console.warn("Could not write liked movies to localStorage.", e);
    }
  }, [likedMovies]);

  // Simplified effect to track if the URL wants the player to be open
  useEffect(() => {
    const checkUrlForPlay = () => {
        const params = new URLSearchParams(window.location.search);
        setShouldPlay(params.get('play') === 'true');
    };

    checkUrlForPlay(); // Initial check on mount
    window.addEventListener('popstate', checkUrlForPlay);
    window.addEventListener('pushstate', checkUrlForPlay);

    return () => {
        window.removeEventListener('popstate', checkUrlForPlay);
        window.removeEventListener('pushstate', checkUrlForPlay);
    };
  }, []);

  // Countdown timer for unreleased movies
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

  // Derived constant to determine player mode, simplifying render logic
  const isPlayerMode = shouldPlay && movie && movie.fullMovie && released;

  // Ad initialization effect
  useEffect(() => {
    if (isPlayerMode) {
        const timer = setTimeout(() => initializeAds(), 100);
        return () => clearTimeout(timer);
    } else {
        if (adsManagerRef.current) {
            adsManagerRef.current.destroy();
            adsManagerRef.current = null;
        }
        setIsAdPlaying(false);
    }
  }, [isPlayerMode, initializeAds]);

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

    // Effect for saving/restoring video progress
    useEffect(() => {
        if (!isPlayerMode || !videoRef.current || !movie) return;

        const video = videoRef.current;
        let progressInterval: ReturnType<typeof setInterval>;

        const handleTimeUpdate = () => {
            if (video.currentTime > 1 && !video.paused) {
                localStorage.setItem(`cratetv-progress-${movie.key}`, video.currentTime.toString());
            }
        };

        const handleLoadedMetadata = () => {
            const savedTime = localStorage.getItem(`cratetv-progress-${movie.key}`);
            if (savedTime) {
                const time = parseFloat(savedTime);
                if (time < video.duration) video.currentTime = time;
            }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        progressInterval = setInterval(handleTimeUpdate, 5000);

        return () => {
            clearInterval(progressInterval);
            handleTimeUpdate();
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [isPlayerMode, movie]);


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
        if (query) {
             window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
             window.dispatchEvent(new Event('pushstate'));
        }
    };
    
    const handleMovieEnd = () => {
      if (movie) localStorage.removeItem(`cratetv-progress-${movie.key}`);
      handleExitPlayer(); // Go back to poster view instead of home
    };
    
    const handlePlayFromPoster = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('play', 'true');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleExitPlayer = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('play');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new Event('pushstate'));
    };
    
    const handleDonationSuccess = (details: { amount: number; email?: string }) => {
        setIsSupportModalOpen(false);
        setLastDonationDetails(details);
        setIsDonationSuccessModalOpen(true);
    };

    const toggleLikeMovie = useCallback(async (movieKey: string) => {
        const newLikedMovies = new Set(likedMovies);
        const action = newLikedMovies.has(movieKey) ? 'unlike' : 'like';

        if (action === 'unlike') {
            newLikedMovies.delete(movieKey);
        } else {
            newLikedMovies.add(movieKey);
        }
        setLikedMovies(newLikedMovies);

        try {
            await fetch('/api/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, action }),
            });
        } catch (error) {
            console.error("Failed to send like update to server:", error);
        }
    }, [likedMovies]);


    const handlePlayerInteraction = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => {
      return () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
    }, []);

    if (isDataLoading || !movie) {
        return <LoadingSpinner />;
    }
    
    const isLiked = likedMovies.has(movie.key);

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
            
            {!isPlayerMode && (
                <Header
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    isScrolled={true}
                    onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                    onSearchSubmit={handleSearchSubmit}
                    isStaging={isStaging}
                />
            )}

            <main className={`flex-grow ${isPlayerMode ? 'flex items-center justify-center' : 'pt-4 md:pt-20 pb-24 md:pb-0'}`}>
                <div 
                    ref={videoContainerRef} 
                    className="relative w-full aspect-video bg-black secure-video-container group"
                    onClick={handlePlayerInteraction}
                    onMouseMove={handlePlayerInteraction}
                >
                    <div ref={adContainerRef} className="absolute inset-0 z-20" />
                    
                    {isPlayerMode ? (
                        <video 
                            ref={videoRef} 
                            src={movie.fullMovie} 
                            className="w-full h-full"
                            controls={!isAdPlaying}
                            playsInline
                            onContextMenu={(e) => e.preventDefault()} 
                            controlsList="nodownload"
                            onEnded={handleMovieEnd}
                            autoPlay
                        />
                    ) : (
                        <>
                            <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30" onContextMenu={(e) => e.preventDefault()} />
                            
                            {released ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-contain" onContextMenu={(e) => e.preventDefault()} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <button 
                                        onClick={handlePlayFromPoster}
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
                    
                    {isPlayerMode && (
                        <div className={`absolute inset-0 z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {/* Back to Home Button */}
                             <button
                                onClick={() => {
                                    window.history.pushState({}, '', '/');
                                    window.dispatchEvent(new Event('pushstate'));
                                }}
                                className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors text-white"
                                aria-label="Back to Home"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            {/* Right side controls */}
                            <div className="absolute top-4 right-4 flex items-center gap-4">
                                <CastButton videoElement={videoRef.current} />
                                <button
                                    onClick={handleExitPlayer}
                                    className="bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors text-white"
                                    aria-label="Exit video player"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {!isPlayerMode && (
                  <div className="max-w-6xl mx-auto p-4 md:p-8">
                      <h1 className="text-3xl md:text-5xl font-bold text-white">{movie.title || 'Untitled Film'}</h1>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                          {!movie.hasCopyrightMusic && (
                            <button onClick={() => setIsSupportModalOpen(true)} className="flex items-center justify-center px-4 py-2 bg-purple-600/80 text-white font-bold rounded-md hover:bg-purple-700/80 transition-colors">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" /></svg>
                               Support Filmmaker
                            </button>
                          )}
                           <button onClick={() => toggleLikeMovie(movie.key)} className={`h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
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
            
            {!isPlayerMode && (
              <>
                <CollapsibleFooter />
                <BackToTopButton />
              </>
            )}
            
            <BottomNavBar 
                onSearchClick={() => setIsMobileSearchOpen(true)}
            />

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