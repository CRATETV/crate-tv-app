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
                video.play();
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
    
    const handleFullscreen = async () => {
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
    };

    const handleShowDetails = () => {
        videoRef.current?.pause();
        setIsDetailsModalOpen(true);
    };
    
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        handlePlayerInteraction();

        if (clickTimeout.current) {
            // This is a double-click. Clear the single-click timer.
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;

            // Determine action based on click position
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const clickX = e.clientX - rect.left;