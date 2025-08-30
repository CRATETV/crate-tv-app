import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types.ts';
import { moviesData, categoriesData } from '../constants.ts';
import ActorBioModal from './ActorBioModal.tsx';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import BackToTopButton from './BackToTopButton.tsx';
// FIX: Import SearchOverlay component
import SearchOverlay from './SearchOverlay.tsx';

interface MoviePageProps {
  movieKey: string;
}

type PlayerMode = 'poster' | 'trailer' | 'full';

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Like state
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);

  // Player state
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Always start muted for autoplay compatibility
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWidescreen, setIsWidescreen] = useState(false);
  
  // FIX: Add state for mobile search overlay
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  useEffect(() => {
    const movieData = { ...moviesData[movieKey] };
    if (movieData) {
      // Initialize likes from local storage for this specific movie
      const storedLikes = localStorage.getItem(`cratetv-${movieKey}-likes`);
      if (storedLikes) {
        movieData.likes = parseInt(storedLikes, 10);
      }
      setMovie(movieData);

      // Initialize liked set from local storage
      const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
      if (storedLikedMovies) {
        setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
      }

      // Handle play from URL
      const params = new URLSearchParams(window.location.search);
      const shouldPlay = params.get('play') === 'true';
      if (shouldPlay && movieData.fullMovie) {
        setPlayerMode('full');
      }
    } else {
      // Handle movie not found, maybe redirect
      window.location.href = '/';
    }
  }, [movieKey]);

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

  // Effect to handle playing the video when mode changes from poster to video
  useEffect(() => {
    if (playerMode !== 'poster' && videoRef.current) {
        videoRef.current.play().catch(error => {
            console.error("Video playback failed:", error);
            // The onPause event will automatically set isPlaying to false if play fails.
        });
    }
  }, [playerMode, movie?.key]);


  const toggleLikeMovie = useCallback((key: string) => {
    if (!movie) return;

    const newLikedMovies = new Set(likedMovies);
    let likesChange = 0;

    if (newLikedMovies.has(key)) {
      newLikedMovies.delete(key);
      likesChange = -1;
    } else {
      newLikedMovies.add(key);
      likesChange = 1;
      // Animate
      setIsAnimatingLike(true);
      setTimeout(() => setIsAnimatingLike(false), 500);
    }

    setLikedMovies(newLikedMovies);
    localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));

    const updatedMovie = { 
      ...movie, 
      likes: Math.max(0, (movie.likes || 0) + likesChange) 
    };
    setMovie(updatedMovie);
    localStorage.setItem(`cratetv-${key}-likes`, updatedMovie.likes.toString());
  }, [likedMovies, movie]);

  const handleSelectActor = (actor: Actor) => {
    setSelectedActor(actor);
  };
  
  const handleCloseActorModal = () => {
    setSelectedActor(null);
  };

  const recommendedMovies = useMemo(() => {
    if (!movie) return [];
    const recommendedKeys = new Set<string>();
    const currentMovieCategories = Object.values(categoriesData).filter(cat => cat.movieKeys.includes(movie.key));
    
    currentMovieCategories.forEach(cat => {
      cat.movieKeys.forEach(key => {
        if (key !== movie.key) {
          recommendedKeys.add(key);
        }
      });
    });

    return Array.from(recommendedKeys)
      .map(key => moviesData[key])
      .filter(Boolean)
      .slice(0, 6); // Limit to 6 recommendations
  }, [movie]);


  const handlePlay = (mode: 'trailer' | 'full') => {
    setPlayerMode(mode);
    setIsMuted(false); // Unmute on explicit user action
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
  
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (videoRef.current.duration / 100) * Number(e.target.value);
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
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
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleWidescreen = () => {
    setIsWidescreen(prev => !prev);
  };

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

  const handleVideoEnded = () => {
    setPlayerMode('poster');
  };
  
  const handleSearch = (query: string) => {
    if (query) {
      window.location.href = `/?search=${encodeURIComponent(query)}`;
    }
  };

  if (!movie) {
    return <LoadingSpinner />;
  }
  
  const isLiked = likedMovies.has(movie.key);
  const videoSource = playerMode === 'full' ? movie.fullMovie : movie.trailer;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        <div className="fixed top-0 left-0 w-full h-2.5 bg-gradient-to-r from-red-500 via-blue-500 via-purple-500 via-orange-500 via-green-500 to-red-500 bg-[length:300%_100%] animate-colorChange z-50"></div>
        {/* FIX: Add onMobileSearchClick prop to Header to handle mobile search icon clicks. */}
        <Header searchQuery="" onSearch={handleSearch} isScrolled={true} onMobileSearchClick={() => setIsMobileSearchOpen(true)} />

        <main className="flex-grow pt-16">
            <div 
                ref={videoContainerRef} 
                className={`relative bg-black group/video shadow-lg shadow-black/50 transition-[max-width] duration-500 ease-in-out mx-auto ${isWidescreen ? 'w-full max-w-full' : 'max-w-5xl'}`}
            >
                <div className={`w-full ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
                    {playerMode === 'poster' ? (
                        <div className="relative w-full h-full">
                            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4">
                                {movie.trailer && (
                                    <button onClick={() => handlePlay('trailer')} className="flex items-center justify-center px-6 py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors text-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                        Play Trailer
                                    </button>
                                )}
                                {movie.fullMovie && (
                                    <button onClick={() => handlePlay('full')} className="flex items-center justify-center px-6 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors text-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                        Play Full Movie
                                    </button>
                                )}
                             </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                key={videoSource}
                                className="w-full h-full object-contain"
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

                            {/* Custom Controls */}
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
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
                                  {playerMode === 'trailer' && movie.fullMovie && <button onClick={() => handlePlay('full')} className="text-white bg-red-600 px-3 py-1 text-sm rounded hover:bg-red-700">Watch Full Movie</button>}
                                </div>
                                <div className="flex items-center space-x-2">
                                   <button onClick={toggleMute} className="text-white p-2">
                                    {isMuted ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                                    )}
                                  </button>
                                  <div className="text-white text-sm">
                                    <span>{formatTime(videoRef.current?.currentTime ?? 0)}</span> / <span>{formatTime(duration)}</span>
                                  </div>
                                  <button onClick={toggleWidescreen} className="text-white p-2 hidden md:block" aria-label="Toggle theater mode">
                                    {isWidescreen ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <title>Exit Theater Mode</title>
                                        <rect x="5" y="5" width="14" height="14" rx="1"></rect>
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <title>Enter Theater Mode</title>
                                        <rect x="2" y="7" width="20" height="10" rx="1"></rect>
                                      </svg>
                                    )}
                                  </button>
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
                        </>
                    )}
                </div>
            </div>
            <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
                <a href="/" className="text-red-400 hover:text-red-300 mb-4 inline-block">&larr; Back to Home</a>
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold">{movie.title}</h1>
                    <div className="flex items-center space-x-2 text-white flex-shrink-0 ml-4">
                        <button onClick={() => toggleLikeMovie(movie.key)} className="flex items-center space-x-1 hover:text-red-500 transition-colors" aria-label={`Like ${movie.title}`}>
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
                                <div key={actor.name} className="flex items-center space-x-3 group cursor-pointer" onClick={() => handleSelectActor(actor)}>
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
                        <a
                          key={recMovie.key}
                          href={`/movie/${recMovie.key}`}
                          className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105"
                        >
                          <img src={recMovie.poster} alt={recMovie.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
        </main>
        
        <Footer />
        <BackToTopButton />

        {selectedActor && (
          <ActorBioModal
            actor={selectedActor}
            onClose={handleCloseActorModal}
          />
        )}
        {/* FIX: Render SearchOverlay for mobile search */}
        {isMobileSearchOpen && (
          <SearchOverlay 
            searchQuery={mobileSearchQuery}
            onSearch={(query) => {
              setMobileSearchQuery(query);
              handleSearch(query);
            }}
            onClose={() => setIsMobileSearchOpen(false)}
          />
        )}
    </div>
  );
};

export default MoviePage;