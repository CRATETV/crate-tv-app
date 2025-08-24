import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, Actor, Category } from '../types.ts';

interface MovieDetailsModalProps {
  movie: Movie;
  isLiked: boolean;
  onToggleLike: (movieKey: string) => void;
  onClose: (clearUrl?: boolean) => void;
  onSelectActor: (actor: Actor) => void;
  startWithFullMovie?: boolean;
  allMovies: Record<string, Movie>;
  allCategories: Record<string, Category>;
  onSelectRecommendedMovie: (movie: Movie) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ 
  movie, 
  isLiked,
  onToggleLike,
  onClose, 
  onSelectActor, 
  startWithFullMovie = false,
  allMovies,
  allCategories,
  onSelectRecommendedMovie,
  onMouseEnter,
  onMouseLeave
}) => {
  const [isPlayingFullMovie, setIsPlayingFullMovie] = useState(startWithFullMovie);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // State for custom video controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);

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
    setIsPlayingFullMovie(startWithFullMovie);
    // Reset video state when movie changes
    setProgress(0);
    setIsPlaying(true);
  }, [startWithFullMovie, movie.key]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

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
      .slice(0, 6); // Limit to 6 recommendations
  }, [movie, allMovies, allCategories]);

  const playFullMovie = () => {
    if (movie.fullMovie) {
        setIsPlayingFullMovie(true);
        setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (videoRef.current.duration / 100) * Number(e.target.value);
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newVolume = Number(e.target.value);
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleVideoEnded = () => {
    if (isPlayingFullMovie) {
      setIsPlayingFullMovie(false);
    }
    setIsPlaying(false);
    setProgress(100);
  };

  const toggleFullScreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLikeClick = () => {
    onToggleLike(movie.key);
    if (!isLiked) {
      setIsAnimatingLike(true);
      setTimeout(() => setIsAnimatingLike(false), 500);
    }
  };
  
  const hasTrailer = movie.trailer && movie.trailer.length > 5;
  const shouldPlayFullMovie = isPlayingFullMovie && movie.fullMovie;
  const videoSource = shouldPlayFullMovie ? movie.fullMovie : movie.trailer;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]" onClick={() => onClose(true)}>
      <div 
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-hide" 
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <button onClick={() => onClose(true)} className="absolute top-3 right-3 text-gray-400 hover:text-white z-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div ref={videoContainerRef} className="relative w-full aspect-video bg-black group/video">
            {hasTrailer || movie.fullMovie ? (
              <video
                  ref={videoRef}
                  key={videoSource}
                  className="w-full h-full"
                  autoPlay
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
            ) : (
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-contain" />
            )}

            {!shouldPlayFullMovie && hasTrailer && (
                <button 
                    onClick={playFullMovie} 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300"
                >
                    <div className="bg-white/20 rounded-full p-4 hover:bg-red-500/80 transition-all duration-300 transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="absolute bottom-12 text-white font-bold text-lg">Play Full Movie</span>
                </button>
            )}

            {/* Custom Controls */}
            <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
              {/* Progress Bar */}
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={handleProgressChange}
                className="w-full h-1 bg-gray-500/50 rounded-lg appearance-none cursor-pointer range-sm"
                style={{
                    background: `linear-gradient(to right, #ef4444 ${progress}%, #6b7280 ${progress}%)`
                }}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-4">
                  <button onClick={togglePlayPause} className="text-white">
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M5.071 8.043a.5.5 0 01.023.634l-1.334 1.524A5.002 5.002 0 0012 15a.5.5 0 010 1A6.002 6.002 0 015 10.334a.5.5 0 01.071-.291zM14.929 8.334a.5.5 0 01.29.922A6.002 6.002 0 0115 16.334a.5.5 0 11-1-.001A5.002 5.002 0 006 11.858l-1.334-1.524a.5.5 0 01.657-.657l1.334 1.524A4.982 4.982 0 0010 11c.883 0 1.705-.233 2.429-.642l1.5 1.714a.5.5 0 11.7-.7l-1.5-1.714A4.982 4.982 0 0014.929 8.334zM10 4a.5.5 0 01.5.5v2.071a.5.5 0 01-1 0V4.5A.5.5 0 0110 4z" /></svg>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={volume} 
                      onChange={handleVolumeChange} 
                      className="w-20 h-1 bg-gray-500/50 rounded-lg appearance-none cursor-pointer range-sm"
                      style={{
                          background: `linear-gradient(to right, #ffffff ${volume * 100}%, #6b7280 ${volume * 100}%)`
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-white text-sm">
                    <span>{formatTime(videoRef.current?.currentTime ?? 0)}</span> / <span>{formatTime(duration)}</span>
                  </div>
                  <button onClick={toggleFullScreen} className="text-white" aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
                    {isFullScreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl md:text-3xl font-bold">{movie.title}</h2>
                <div className="flex items-center space-x-2 text-white flex-shrink-0 ml-4">
                    <button onClick={handleLikeClick} className="flex items-center space-x-1 hover:text-red-500 transition-colors" aria-label={`Like ${movie.title}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" 
                            className={`h-8 w-8 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'} ${isAnimatingLike ? 'animate-heartbeat' : ''}`}
                            fill={isLiked ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    <span className="text-lg font-semibold">{movie.likes}</span>
                </div>
            </div>
            <p className="text-gray-300 mb-6" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            
            <div className="bg-gradient-to-r from-red-500/20 to-blue-500/20 p-3 rounded-lg text-center mb-4 border border-gray-700">
                <p className="text-sm text-white">✨ Click on an actor's name for their bio and an AI-generated fun fact!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-semibold mb-3 border-b-2 border-gray-700 pb-2">Cast</h3>
                    <div className="space-y-3">
                        {movie.cast.map((actor) => (
                            <div key={actor.name} className="flex items-center space-x-3 group cursor-pointer" onClick={() => onSelectActor(actor)}>
                                <img src={actor.photo} alt={actor.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 group-hover:border-red-500 transition"/>
                                <span className="text-white group-hover:text-red-400 transition">{actor.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold mb-3 border-b-2 border-gray-700 pb-2">Director</h3>
                    <p className="text-gray-300">{movie.director}</p>
                </div>
            </div>

            {recommendedMovies.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-xl font-semibold mb-4">You Might Also Like</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recommendedMovies.map(recMovie => (
                    <div
                      key={recMovie.key}
                      className="group relative rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105"
                      onClick={() => onSelectRecommendedMovie(recMovie)}
                    >
                      <img src={recMovie.poster} alt={recMovie.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <p className="text-white text-center text-sm font-bold">{recMovie.title}</p>
                      </div>
                    </div>
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