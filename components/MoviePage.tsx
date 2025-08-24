import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types.ts';
import { moviesData, categoriesData } from '../constants.ts';
import ActorBioModal from './ActorBioModal.tsx';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import BackToTopButton from './BackToTopButton.tsx';

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
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
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
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

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
    setIsPlaying(true);
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
    setIsPlaying(false);
    setProgress(100);
    setPlayerMode('poster'); // Return to poster view after video ends
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
  
  const handleSearch = (query: string) => {
    if (query) {
      window.location.href = `/?search=${query}`;
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
        <Header searchQuery="" onSearch={handleSearch} />

        <main className="flex-grow pt-16">
            <div className="max-w-5xl mx-auto">
                <div ref={videoContainerRef} className="relative w-full aspect-video bg-black group/video rounded-lg overflow-hidden shadow-lg shadow-black/50">
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

                            {/* Custom Controls */}
                            <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
                              <input type="range" min="0" max="100" value={progress} onChange={handleProgressChange} className="w-full h-1 bg-gray-500/50 rounded-lg appearance-none cursor-pointer range-sm" style={{ background: `linear-gradient(to right, #ef4444 ${progress}%, #6b7280 ${progress}%)` }} />
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center space-x-4">
                                  <button onClick={togglePlayPause} className="text-white">{isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}</button>
                                  {playerMode === 'trailer' && movie.fullMovie && <button onClick={() => handlePlay('full')} className="text-white bg-red-600 px-3 py-1 text-sm rounded hover:bg-red-700">Watch Full Movie</button>}
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-white text-sm"><span>{formatTime(videoRef.current?.currentTime ?? 0)}</span> / <span>{formatTime(duration)}</span></div>
                                  <button onClick={toggleFullScreen} className="text-white" aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>{isFullScreen ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>}</button>
                                </div>
                              </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 sm:p-6 md:p-8">
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
                              className="group relative rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105"
                            >
                              <img src={recMovie.poster} alt={recMovie.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                <p className="text-white text-center text-sm font-bold">{recMovie.title}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
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
    </div>
  );
};

export default MoviePage;