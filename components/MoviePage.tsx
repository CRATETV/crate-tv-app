import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types';
import ActorBioModal from './ActorBioModal';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';
import StagingBanner from './StagingBanner';
import DirectorCreditsModal from './DirectorCreditsModal';
import Countdown from './Countdown';
import CastButton from './CastButton';
import { isMovieReleased } from '../constants';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import PauseOverlay from './PauseOverlay';
import MovieDetailsModal from './MovieDetailsModal';


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

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const { user } = useAuth();
  const { isLoading: isDataLoading, movies: allMovies, categories: allCategories, dataSource } = useFestival();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [released, setReleased] = useState(false);
  const hasTrackedViewRef = useRef(false);
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

  // Player state
  const [isPaused, setIsPaused] = useState(false); // Start as playing
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Modal & Search State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Staging State
  const [isStaging, setIsStaging] = useState(false);
  
  // Ad State
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

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
  }, [movie?.key]);
  
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
        adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => videoElement.pause());
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
    adsRequest.adTagUrl = 'https://googleads.g.doubleclick.net/pagead/ads?ad_type=video&client=ca-video-pub-5748304047766155&videoad_start_delay=0&description_url=' + encodeURIComponent(window.location.href);
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
  }, []);
  
  useEffect(() => {
      const sourceMovie = allMovies[movieKey];
      if (sourceMovie) {
          setMovie(sourceMovie);
          setReleased(isMovieReleased(sourceMovie));
          hasTrackedViewRef.current = false; // Reset view tracking for new movie
      } else if (!isDataLoading) {
          window.history.replaceState({}, '', '/');
          window.dispatchEvent(new Event('pushstate'));
      }
  }, [movieKey, allMovies, isDataLoading]);

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

    useEffect(() => {
        if (!videoRef.current || !movie) return;
        const video = videoRef.current;
        const handleTimeUpdate = () => {
            if (video.currentTime > 1 && !video.paused) {
                localStorage.setItem(`cratetv-progress-${movie.key}`, video.currentTime.toString());
            }
        };
        const handleLoadedMetadata = () => {
            const savedTime = localStorage.getItem(`cratetv-progress-${movie.key}`);
            if (savedTime) video.currentTime = parseFloat(savedTime);
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        const progressInterval = setInterval(handleTimeUpdate, 5000);
        return () => {
            clearInterval(progressInterval);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [movie]);
    
    const handleMovieEnd = () => {
      if (movie) localStorage.removeItem(`cratetv-progress-${movie.key}`);
      handleGoHome();
    };

    const handlePlayerInteraction = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      const handlePause = () => !video.ended && setIsPaused(true);
      const handlePlay = () => setIsPaused(false);
      video.addEventListener('pause', handlePause);
      video.addEventListener('play', handlePlay);
      video.addEventListener('playing', handlePlayerInteraction); // Show controls when playback starts
      return () => {
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('playing', handlePlayerInteraction);
      };
    }, [handlePlayerInteraction]);

    const handleShowDetails = () => {
        videoRef.current?.pause();
        setIsDetailsModalOpen(true);
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };
    
    const handleSelectRecommendedMovie = (recommendedMovie: Movie) => {
        setIsDetailsModalOpen(false);
        window.history.pushState({}, '', `/movie/${recommendedMovie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handlePlayFromModal = () => {
        setIsDetailsModalOpen(false);
        videoRef.current?.play();
    };

    const toggleLikeMovie = async (movieKey: string) => {
        const newLiked = new Set(likedMovies);
        newLiked.has(movieKey) ? newLiked.delete(movieKey) : newLiked.add(movieKey);
        setLikedMovies(newLiked);
        localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLiked)));
        await fetch('/api/toggle-like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieKey, action: newLiked.has(movieKey) ? 'like' : 'unlike' }),
        });
    };

    if (isDataLoading || !movie) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {isStaging && <StagingBanner onExit={() => { sessionStorage.removeItem('crateTvStaging'); window.location.reload(); }} isOffline={dataSource === 'fallback'} />}
            
            <main className="flex-grow flex items-center justify-center">
                <div 
                    className="relative w-full aspect-video bg-black secure-video-container group"
                    onClick={handlePlayerInteraction}
                    onMouseMove={handlePlayerInteraction}
                >
                    <div ref={adContainerRef} className="absolute inset-0 z-20" />
                    
                    {movie.fullMovie && released ? (
                        <>
                            <video 
                                ref={videoRef} 
                                src={movie.fullMovie} 
                                className="w-full h-full"
                                playsInline
                                onContextMenu={(e) => e.preventDefault()} 
                                controlsList="nodownload"
                                onEnded={handleMovieEnd}
                                autoPlay
                                onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
                            />
                            {isPaused && (
                                <PauseOverlay
                                    movie={movie}
                                    onResume={() => videoRef.current?.play()}
                                    onExitPlayer={handleShowDetails}
                                    onSelectActor={setSelectedActor}
                                />
                            )}
                            <div className={`absolute inset-0 z-30 transition-opacity duration-300 ${showControls && !isPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <button onClick={handleGoHome} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70" aria-label="Back to Home"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                                <div className="absolute top-4 right-4 flex items-center gap-4">
                                    <CastButton videoElement={videoRef.current} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4">
                            <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30" />
                            <h2 className="text-3xl font-bold mb-4">{released ? 'Video Not Available' : 'Coming Soon'}</h2>
                            {!released && movie.releaseDateTime && (
                                <div className="bg-black/50 p-4 rounded-lg"><Countdown targetDate={movie.releaseDateTime} onEnd={() => setReleased(true)} className="text-xl" /></div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            {isDetailsModalOpen && (
                <MovieDetailsModal
                    movie={movie}
                    isLiked={likedMovies.has(movie.key)}
                    onToggleLike={toggleLikeMovie}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onSelectActor={setSelectedActor}
                    allMovies={allMovies}
                    allCategories={allCategories}
                    onSelectRecommendedMovie={handleSelectRecommendedMovie}
                    onPlayMovie={handlePlayFromModal}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={() => setSelectedActor(null)} />}
        </div>
    );
};

export default MoviePage;