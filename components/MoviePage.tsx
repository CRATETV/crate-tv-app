import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import LoadingSpinner from './LoadingSpinner';
import StagingBanner from './StagingBanner';
import { isMovieReleased } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';
import SquarePaymentModal from './SquarePaymentModal';
import CastButton from './CastButton';
// FIX: Add missing import for the Countdown component
import Countdown from './Countdown';


declare const google: any; // Declare Google IMA SDK global

interface MoviePageProps {
  movieKey: string;
}

const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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

export const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user, markAsWatched, likedMovies: likedMoviesArray, toggleLikeMovie, getUserIdToken, watchlist, toggleWatchlist } = useAuth();
  const { isLoading: isDataLoading, movies: allMovies, categories: allCategories, dataSource } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const hasTrackedViewRef = useRef(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seekAnim, setSeekAnim] = useState<'rewind' | 'forward' | null>(null);
  const clickTimeout = useRef<number | null>(null);
  
  // Modal & Search State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
  // Staging State
  const [isStaging, setIsStaging] = useState(false);
  
  // Ad State
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

  const isLiked = useMemo(() => likedMoviesArray.includes(movieKey), [likedMoviesArray, movieKey]);
  const isOnWatchlist = useMemo(() => watchlist.includes(movieKey), [watchlist, movieKey]);
  const [released, setReleased] = useState(() => isMovieReleased(movie));

  const playContent = useCallback(async () => {
    setIsAdPlaying(false);
    if (videoRef.current) {
        if (!hasTrackedViewRef.current && movie?.key) {
            hasTrackedViewRef.current = true;
            const token = await getUserIdToken();
            if (token) {
                fetch('/api/track-view', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ movieKey: movie.key }),
                }).catch(err => console.error("Failed to track view:", err));
            } else {
                 console.warn("Could not track view: user token not available.");
            }
        }
        videoRef.current.play().catch(e => console.error("Content play failed", e));
        setIsPlaying(true);
    }
  }, [movie?.key, getUserIdToken]);
  
  const initializeAds = useCallback(() => {
    if (!videoRef.current || !adContainerRef.current || !released || adsManagerRef.current || typeof google === 'undefined') {
        playContent();
        return;
    }
    
    const videoElement = videoRef.current;
    const adContainer = adContainerRef.current;
    setIsAdPlaying(true);

    const adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
    const adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    adsLoaderRef.current = adsLoader;

    adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: any) => {
        const adsManager = e.getAdsManager(videoElement);
        adsManagerRef.current = adsManager;
        adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => { videoElement.pause(); setIsPlaying(false); });
        adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, playContent);
        adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, playContent);
        adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, () => playContent());
        try {
            adsManager.init(videoElement.clientWidth, videoElement.clientHeight, google.ima.ViewMode.NORMAL);
            adsManager.start();
        } catch (adError) {
            playContent();
        }
    }, false);
    
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, () => playContent(), false);
    
    const adsRequest = new google.ima.AdsRequest();
    
    // Dynamically load the VAST tag from localStorage or use a fallback
    const customAdTag = localStorage.getItem('productionAdTagUrl');
    const sampleAdTag = 'https://storage.googleapis.com/interactive-media-ads/ad-tags/unknown/vast_skippable.xml';
    
    adsRequest.adTagUrl = customAdTag || sampleAdTag;
    console.log(`Using VAST Ad Tag: ${adsRequest.adTagUrl}`);
    
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

  useEffect(() => {
    const isStagingActive = sessionStorage.getItem('crateTvStaging') === 'true';
    if (isStagingActive) setIsStaging(true);
    hasTrackedViewRef.current = false; // Reset view tracking on movie key change
  }, [movieKey]);
  
  useEffect(() => {
      if (!isDataLoading && !movie) {
          window.history.replaceState({}, '', '/');
          window.dispatchEvent(new Event('pushstate'));
      }
  }, [isDataLoading, movie]);

  useEffect(() => {
    if (movie && movie.fullMovie && released) {
        const timer = setTimeout(() => initializeAds(), 100);
        return () => clearTimeout(timer);
    }
  }, [movie, released, initializeAds]);

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

        const schema = {
          "@context": "https://schema.org",
          "@type": "Movie",
          "name": movie.title,
          "description": synopsisText,
          "image": movie.poster,
          "url": pageUrl,
          "director": movie.director.split(',').map(name => ({ "@type": "Person", "name": name.trim() })),
          "actor": movie.cast.map(actor => ({ "@type": "Person", "name": actor.name })),
          ...(movie.rating && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": movie.rating.toString(),
              "bestRating": "10",
              "ratingCount": "1" // Placeholder
            }
          })
        };
        
        let scriptTag = document.getElementById('movie-schema') as HTMLScriptElement | null;
        if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.id = 'movie-schema';
            document.head.appendChild(scriptTag);
        }
        scriptTag.type = 'application/ld+json';
        scriptTag.textContent = JSON.stringify(schema);

        return () => {
            const script = document.getElementById('movie-schema');
            if (script) document.head.removeChild(script);
        };
    }
 }, [movie]);

    const handlePlayerInteraction = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    const handleGoHome = useCallback(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        const handlePlay = () => { 
            setIsPlaying(true); 
            setIsPaused(false); 
            handlePlayerInteraction();
        };
        const handlePause = () => { setIsPlaying(false); if (!video.ended) setIsPaused(true); };
        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.duration > 0 && (video.currentTime / video.duration) > 0.9) {
                markAsWatched(movieKey);
            }
        };
        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            const savedTime = localStorage.getItem(`cratetv-progress-${movieKey}`);
            if (savedTime) video.currentTime = parseFloat(savedTime);
        };
        const handleEnded = () => {
            setIsPlaying(false);
            setIsPaused(false);
            markAsWatched(movieKey);
            localStorage.removeItem(`cratetv-progress-${movieKey}`);
            handleGoHome();
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        const progressInterval = setInterval(() => {
            if (video.currentTime > 1 && !video.paused) {
                localStorage.setItem(`cratetv-progress-${movieKey}`, video.currentTime.toString());
            }
        }, 5000);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
            clearInterval(progressInterval);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (clickTimeout.current) clearTimeout(clickTimeout.current);
        };
    }, [movieKey, handlePlayerInteraction, markAsWatched, handleGoHome]);

    // Autoplay fallback effect
    useEffect(() => {
        const video = videoRef.current;
        if (video && movie?.fullMovie && released && !isAdPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Autoplay was prevented. User interaction required.", error);
                    setIsPaused(true);
                });
            }
        }
    }, [movie?.fullMovie, released, isAdPlaying]);


    const handlePlayPause = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            if (video.muted) {
                video.muted = false;
            }
            if (video.paused) {
                video.play().catch(e => console.error("Error attempting to play video:", e));
            } else {
                video.pause();
            }
        }
    }, []);

    const handleSeek = (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
    };
    
    const handleRewind = useCallback(() => {
        if (!videoRef.current) return;
        handleSeek(Math.max(0, videoRef.current.currentTime - 10));
        setSeekAnim('rewind');
        setTimeout(() => setSeekAnim(null), 500);
    }, []);

    const handleForward = useCallback(() => {
        if (!videoRef.current) return;
        handleSeek(Math.min(videoRef.current.duration || Infinity, videoRef.current.currentTime + 10));
        setSeekAnim('forward');
        setTimeout(() => setSeekAnim(null), 500);
    }, []);
    
    const handleFullscreen = useCallback(async () => {
        const player = playerContainerRef.current as any; // Use 'any' to access prefixed methods
        if (!player) return;

        const isInFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement;

        try {
            if (isInFullscreen) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                }
            } else {
                if (player.requestFullscreen) {
                    await player.requestFullscreen();
                } else if (player.webkitRequestFullscreen) {
                    // This is the key for iOS Safari
                    player.webkitRequestFullscreen();
                }
                
                // Screen orientation lock is experimental and can fail gracefully.
                try {
                    if (screen.orientation && (screen.orientation as any).lock) {
                        await (screen.orientation as any).lock('landscape');
                    }
                } catch (orientationError) {
                    console.warn("Screen orientation lock failed:", orientationError);
                }
            }
        } catch (error) {
            console.error("Fullscreen request failed:", error);
        }
    }, []);

    const handleShowDetails = () => {
        videoRef.current?.pause();
        setIsDetailsModalOpen(true);
    };
    
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        handlePlayerInteraction();

        if (clickTimeout.current) { // DOUBLE CLICK
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const thirdOfWidth = rect.width / 3;

            if (clickX < thirdOfWidth) {
                handleRewind();
            } else if (clickX > (rect.width - thirdOfWidth)) {
                handleForward();
            } else {
                handleFullscreen(); // Double-click center for fullscreen
            }
        } else { // SINGLE CLICK
            clickTimeout.current = window.setTimeout(() => {
                clickTimeout.current = null;
                handlePlayPause(); // Single click toggles play/pause
            }, 300); // 300ms window to detect double click
        }
    }, [handlePlayerInteraction, handleRewind, handleForward, handlePlayPause, handleFullscreen]);

    if (isDataLoading) {
        return <LoadingSpinner />;
    }
    
    if (!movie) {
         return (
             <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4">Film Not Found</h1>
                <p className="text-gray-400 mb-6">The film you're looking for doesn't exist or may have been removed.</p>
                <button onClick={handleGoHome} className="submit-btn">Return to Home</button>
            </div>
        );
    }
    
    if (!released) {
        return (
            <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center text-center p-4">
                <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-4">Coming Soon</h1>
                    <p className="text-gray-300 mb-6">"{movie.title}" is not yet released.</p>
                    {movie.releaseDateTime && <Countdown targetDate={movie.releaseDateTime} onEnd={() => setReleased(true)} className="text-2xl" />}
                </div>
            </div>
        );
    }

    return (
        <main ref={mainRef} className="flex flex-col min-h-screen bg-black text-white">
            {isStaging && <StagingBanner onExit={() => { sessionStorage.removeItem('crateTvStaging'); window.location.reload(); }} isOffline={dataSource === 'fallback'} />}
            
            <div
                ref={playerContainerRef}
                className="relative w-full h-screen bg-black secure-video-container"
                onMouseMove={handlePlayerInteraction}
                onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
                onClick={handleContainerClick}
            >
                <button onClick={handleGoHome} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 z-30 opacity-50 hover:opacity-100 transition-opacity" aria-label="Back to Home">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>

                <div ref={adContainerRef} className="absolute inset-0 z-20" />
                
                <video
                    ref={videoRef}
                    src={movie.fullMovie}
                    className="w-full h-full object-contain"
                    playsInline
                    onContextMenu={(e) => e.preventDefault()}
                    controlsList="nodownload"
                />

                {isPaused && !isAdPlaying && (
                    <PauseOverlay
                        movie={movie}
                        onMoreDetails={handleShowDetails}
                        onSelectActor={setSelectedActor}
                        onResume={handlePlayPause}
                        onRewind={handleRewind}
                        onForward={handleForward}
                        isLiked={isLiked}
                        onToggleLike={() => toggleLikeMovie(movieKey)}
                        onSupport={() => setIsSupportModalOpen(true)}
                        isOnWatchlist={isOnWatchlist}
                        onToggleWatchlist={() => toggleWatchlist(movieKey)}
                    />
                )}
                
                <CastButton videoElement={videoRef.current} />

                {/* Seek Animation Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    {seekAnim === 'rewind' && <div className="animate-seek text-white text-5xl">« 10s</div>}
                    {seekAnim === 'forward' && <div className="animate-seek text-white text-5xl">10s »</div>}
                </div>
            </div>

            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
            {isDetailsModalOpen && <MovieDetailsModal movie={movie} isLiked={isLiked} onToggleLike={() => toggleLikeMovie(movieKey)} onClose={() => { setIsDetailsModalOpen(false); videoRef.current?.play(); }} onSelectActor={setSelectedActor} allMovies={allMovies} allCategories={allCategories} onSelectRecommendedMovie={() => {}} onSupportMovie={() => setIsSupportModalOpen(true)} />}
            {isSupportModalOpen && <SquarePaymentModal movie={movie} paymentType="donation" onClose={() => setIsSupportModalOpen(false)} onPaymentSuccess={() => { setIsSupportModalOpen(false); }} />}
        </main>
    );
};
