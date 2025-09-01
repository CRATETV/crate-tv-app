import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types.ts';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: (clearUrl?: boolean) => void;
  onSelectActor: (actor: Actor) => void;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
}

type PlayerMode = 'poster' | 'trailer' | 'full';

const RecommendedMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void; }> = ({ movie, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
        <div
            className="group cursor-pointer rounded-md overflow-hidden"
            onClick={() => onClick(movie)}
        >
            <div className="relative aspect-[3/4] bg-gray-800">
                <img
                    src={movie.poster}
                    alt={movie.title}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setIsLoaded(true)}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
};


const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ 
  movie, 
  isLiked,
  onToggleLike,
  onClose, 
  onSelectActor, 
  allMovies,
  allCategories,
  onSelectRecommendedMovie
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  
  // Player State
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasTrailer = useMemo(() => movie.trailer && movie.trailer.length > 5, [movie.trailer]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(true);
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  // Reset player state when movie changes
  useEffect(() => {
    setPlayerMode('poster');
    setProgress(0);
    setIsPlaying(false);
    setDuration(0);
  }, [movie.key]);

  // Programmatic playback effect
  useEffect(() => {
    if (playerMode !== 'poster' && videoRef.current) {
        videoRef.current.play().catch(error => {
            console.error("Video playback failed:", error);
            setIsPlaying(false);
        });
    } else if (playerMode === 'poster' && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  }, [playerMode, movie.key]);


  const recommendedMovies = useMemo(() => {
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(allCategories).filter(cat => cat.movieKeys.includes(movie.key));
    
    currentMovieCategories.forEach(cat => {
      cat.movieKeys.forEach(key => {
        if (key !== movie.key) {
          recommendedKeys.add(key);
        }
      });
    });

    return Array.from(recommendedKeys)
      .map(key => allMovies[key])
      .filter(Boolean)
      .slice(0, 6);
  }, [movie, allMovies, allCategories]);


  const handleLikeClick = () => {
    onToggleLike(movie.key);
    if (!isLiked) {
      setIsAnimatingLike(true);
      setTimeout(() => setIsAnimatingLike(false), 500);
    }
  };
  
  const handlePlay = (mode: 'trailer' | 'full') => {
    setPlayerMode(mode);
    setIsMuted(false); // Unmute on explicit play
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  };
  
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (videoRef.current.duration / 100) * Number(e.target.value);
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };
  
  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleVideoEnded = () => {
    setPlayerMode('poster');
    setIsPlaying(false);
    setProgress(0);
  };
  
  const handleMuteToggle = () => {
      setIsMuted(!isMuted);
  }

  const toggleFullScreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;

    const isCurrentlyFullscreen = 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

    if (!isCurrentlyFullscreen) {
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if ((el as any).mozRequestFullScreen) { // Firefox
            (el as any).mozRequestFullScreen();
        } else if ((el as any).webkitRequestFullscreen) { // Chrome, Safari, Opera
            (el as any).webkitRequestFullscreen();
        } else if ((el as any).msRequestFullscreen) { // IE/Edge
            (el as any).msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) { // Firefox
            (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) { // Chrome, Safari and Opera
            (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) { // IE/Edge
            (document as any).msExitFullscreen();
        }
    }
  };

  const videoSource = playerMode === 'full' ? movie.fullMovie : movie.trailer;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 md:p-4 animate-[fadeIn_0.3s_ease-out]" onClick={() => onClose(true)}>
      <div 
        className="bg-[#181818] rounded-lg shadow-xl w-full max-w-4xl h-full md:max-h-[95vh] overflow-y-auto relative scrollbar-hide" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => onClose(true)} className="absolute top-4 right-4 text-gray-900 bg-white/80 hover:bg-white rounded-full z-20 h-10 w-10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div ref={videoContainerRef} className="relative w-full aspect-video bg-black group/video">
            {playerMode === 'poster' ? (
                <div className="relative w-full h-full">
                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    key={videoSource}
                    className="w-full h-full"
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    onClick={togglePlayPause}
                >
                    <source src={videoSource} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            )}

            {/* Poster Overlay Controls */}
            {playerMode === 'poster' && (
                <div className="absolute bottom-10 left-8 md:left-12 text-white z-10 w-1/2">
                    <h2 className="text-2xl md:text-5xl font-bold drop-shadow-lg">{movie.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        {movie.fullMovie && (
                             <button onClick={() => handlePlay('full')} className="flex items-center justify-center px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                Play Movie
                            </button>
                        )}
                        {hasTrailer && (
                             <button onClick={() => handlePlay('trailer')} className="flex items-center justify-center px-6 py-2 bg-gray-500/70 text-white font-bold rounded-md hover:bg-gray-500/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                Play Trailer
                            </button>
                        )}
                        <button onClick={handleLikeClick} className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition" aria-label="Like">
                            <svg xmlns="http://www.w3.org/2000/svg" 
                                className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'} ${isAnimatingLike ? 'animate-heartbeat' : ''}`}
                                fill={isLiked ? 'currentColor' : 'none'}
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Custom Video Controls */}
            {playerMode !== 'poster' && (
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 z-20">
                    <input type="range" min="0" max="100" value={progress} onChange={handleProgressChange} className="w-full h-1 bg-gray-500/50 rounded-lg appearance-none cursor-pointer range-sm mb-2" style={{ background: `linear-gradient(to right, #ef4444 ${progress}%, #6b7280 ${progress}%)` }} />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={togglePlayPause} className="text-white p-2">
                                {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center space-x-4">
                           <button onClick={handleMuteToggle} className="text-white p-2">
                            {isMuted ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                            )}
                          </button>
                          <div className="text-white text-sm">
                            <span>{formatTime(videoRef.current?.currentTime ?? 0)}</span> / <span>{formatTime(duration)}</span>
                          </div>
                          <button onClick={toggleFullScreen} className="text-white p-2" aria-label="Toggle fullscreen">
                            {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L4 20m0 0h6m-6 0v-6m10-4l6-6m0 0h-6m6 0v6" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 1v-4m0 0h-4m4 0l-5 5" /></svg>
                            )}
                          </button>
                        </div>
                    </div>
                </div>
             )}
        </div>

        <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                     <div className="mt-6 bg-gradient-to-r from-red-500/10 to-blue-500/10 p-3 rounded-lg text-center border border-gray-700">
                        <p className="text-sm text-white">✨ Click an actor's name for their bio & an AI-generated fun fact!</p>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Cast</h3>
                    <div className="space-y-2 text-white">
                        {movie.cast.map((actor) => (
                            <p key={actor.name} className="group cursor-pointer" onClick={() => onSelectActor(actor)}>
                                <span className="group-hover:text-red-400 transition">{actor.name}</span>
                            </p>
                        ))}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2">Director</h3>
                    <p className="text-white">{movie.director}</p>
                 </div>
            </div>

            {recommendedMovies.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-700">
                <h3 className="text-2xl font-bold mb-4">More Like This</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {recommendedMovies.map(recMovie => (
                    <RecommendedMovieCard 
                        key={recMovie.key} 
                        movie={recMovie} 
                        onClick={onSelectRecommendedMovie} 
                    />
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;