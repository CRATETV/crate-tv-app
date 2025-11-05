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

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user, markAsWatched } = useAuth();
  const { isLoading: isDataLoading, movies: allMovies, categories: allCategories, dataSource } = useFestival();
  
  const movie = useMemo(() => allMovies[movieKey], [allMovies, movieKey]);
  
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const hasTrackedViewRef = useRef(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const [seekAnim, setSeekAnim] = useState<'rewind' | 'forward' | null>(null);
  
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

  const isLiked = useMemo(() => likedMovies.has(movieKey), [likedMovies, movieKey]);
  const [released, setReleased] = useState(() => isMovieReleased(movie));

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
        setIsPlaying(true);
    }
  }, [movie?.key]);
  
  const initializeAds = useCallback(() => {
    const productionAdTag = localStorage.getItem('productionAdTagUrl');
    if (!productionAdTag) {
        playContent();
        return;
    }

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
    adsRequest.adTagUrl = productionAdTag;
    
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
    const storedLikes = localStorage.getItem('cratetv-likedMovies');
    if (storedLikes) setLikedMovies(new Set(JSON.parse(storedLikes)));
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
        setMetaTag('property', 'og:title', movie.title || 'Crate TV Film');
        setMetaTag('name', 'description', (movie.synopsis || '').replace(/<br\s*\/?>/gi, ' ').trim());
    }
 }, [movie]);

    const handlePlayerInteraction = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        const handlePlay = () => { setIsPlaying(true); setIsPaused(false); handlePlayerInteraction(); };
        const handlePause = () => { setIsPlaying(false); if (!video.ended) setIsPaused(true); };
        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            // Mark as watched if over 90% complete
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
        };
    }, [movieKey, handlePlayerInteraction, markAsWatched]);

    const handlePlayPause = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
        }
    }, []);

    const handleSeek = (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
    };
    
    const handleRewind = useCallback(() => {
        handleSeek(Math.max(0, currentTime - 10));
        setSeekAnim('rewind');
        setTimeout(() => setSeekAnim(null), 500);
    }, [currentTime]);

    const handleForward = useCallback(() => {
        handleSeek(Math.min(duration, currentTime + 10));
        setSeekAnim('forward');
        setTimeout(() => setSeekAnim(null), 500);
    }, [currentTime, duration]);
    
    const handleFullscreen = async () => {
        const player = playerContainerRef.current;
        if (!player) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await player.requestFullscreen();
                // After entering fullscreen, try to lock orientation
                if (screen.orientation && (screen.orientation as any).lock) {
                    await (screen.orientation as any).lock('landscape');
                }
            }
        } catch (error) {
            console.error("Fullscreen or orientation lock failed:", error);
        }
    };

    const handleTapToSeek = (e: React.MouseEvent<HTMLDivElement>, direction: 'rewind' | 'forward') => {
        const now = new Date().getTime();
        if (now - lastTapRef.current < 300) { // Double tap
            direction === 'rewind' ? handleRewind() : handleForward();
            lastTapRef.current = 0; // Reset tap
        } else {
            lastTapRef.current = now;
        }
    };

    const handleShowDetails = () => {
        videoRef.current?.pause();
        setIsDetailsModalOpen(true);
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };
    
    const toggleLikeMovie = async (key: string) => {
        const newLiked = new Set(likedMovies);
        const action = newLiked.has(key) ? 'unlike' : 'like';
        action === 'like' ? newLiked.add(key) : newLiked.delete(key);
        setLikedMovies(newLiked);
        localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLiked)));
        await fetch('/api/toggle-like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieKey: key, action }),
        });
    };
    
    if (isDataLoading || !movie) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {isStaging && <StagingBanner onExit={() => { sessionStorage.removeItem('crateTvStaging'); window.location.reload(); }} isOffline={dataSource === 'fallback'} />}
            
            <main ref={mainRef} className="flex-grow flex items-center justify-center">
                <div 
                    ref={playerContainerRef}
                    className="relative w-full aspect-video bg-black secure-video-container"
                    onMouseMove={handlePlayerInteraction}
                    onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
                >
                    <div ref={adContainerRef} className={`absolute inset-0 z-20 ${isAdPlaying ? '' : 'pointer-events-none'}`} />
                    
                    {movie.fullMovie && released ? (
                        <>
                            <video 
                                ref={videoRef} 
                                src={movie.fullMovie} 
                                className="w-full h-full"
                                playsInline
                                onContextMenu={(e) => e.preventDefault()} 
                                controlsList="nodownload"
                                autoPlay
                                onClick={handlePlayPause}
                            />
                            {/* Double tap overlays */}
                             <div className="absolute top-0 left-0 h-full w-1/3 z-30" onDoubleClick={(e) => handleTapToSeek(e, 'rewind')}></div>
                             <div className="absolute top-0 right-0 h-full w-1/3 z-30" onDoubleClick={(e) => handleTapToSeek(e, 'forward')}></div>

                             {seekAnim && (
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center p-4 bg-black/50 rounded-full animate-seek`}>
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {seekAnim === 'rewind' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
                                    </svg>
                                </div>
                            )}

                            {isPaused && (
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
                                />
                            )}
                           <div className={`absolute inset-0 z-30 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                                <button onClick={(e) => { e.stopPropagation(); handleGoHome(); }} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 pointer-events-auto" aria-label="Back to Home"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                                {/* Bottom Controls */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto">
                                    {/* Timeline */}
                                    <input type="range" min="0" max={duration} value={currentTime} onChange={e => handleSeek(Number(e.target.value))} className="w-full h-1 bg-gray-500/50 rounded-lg appearance-none cursor-pointer range-sm" />
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-4">
                                            <button onClick={handlePlayPause} className="control-bar-button"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">{isPlaying ? <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />}</svg></button>
                                            <p className="text-xs">{formatTime(currentTime)} / {formatTime(duration)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => toggleLikeMovie(movieKey)} className="control-bar-button" aria-label="Like film">
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                            </button>
                                            {!movie.hasCopyrightMusic && (
                                                <button onClick={() => setIsSupportModalOpen(true)} className="control-bar-button text-purple-300" aria-label="Support filmmaker">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" /></svg>
                                                </button>
                                            )}
                                            <button onClick={handleShowDetails} className="control-bar-button" aria-label="More info">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </button>
                                            <CastButton videoElement={videoRef.current} />
                                            <button onClick={handleFullscreen} className="control-bar-button" aria-label="Toggle fullscreen">
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4-4l-5 5M4 16v4m0 0h4m-4-4l5-5m11 5v-4m0 0h-4m4 4l-5-5" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
                            <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30" />
                            <h2 className="text-3xl font-bold mb-4">{released ? 'Video Not Available' : 'Coming Soon'}</h2>
                        </div>
                    )}
                </div>
            </main>
            
            {isDetailsModalOpen && (
                <MovieDetailsModal
                    movie={movie}
                    isLiked={isLiked}
                    onToggleLike={() => toggleLikeMovie(movieKey)}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onSelectActor={setSelectedActor}
                    allMovies={allMovies}
                    allCategories={allCategories}
                    onSelectRecommendedMovie={(m) => {
                        setIsDetailsModalOpen(false);
                        window.history.pushState({}, '', `/movie/${m.key}`);
                        window.dispatchEvent(new Event('pushstate'));
                    }}
                    onPlayMovie={() => { setIsDetailsModalOpen(false); videoRef.current?.play(); }}
                    onSupportMovie={() => setIsSupportModalOpen(true)}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
             {isSupportModalOpen && movie && (
                <SquarePaymentModal
                    movie={movie}
                    paymentType="donation"
                    onClose={() => setIsSupportModalOpen(false)}
                    onPaymentSuccess={() => { /* Handle success if needed */ }}
                />
            )}
        </div>
    );
};

export default MoviePage;