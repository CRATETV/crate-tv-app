import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, Actor, Category } from '../types.ts';
import { moviesData, categoriesData } from '../constants.ts';
import ActorBioModal from './ActorBioModal.tsx';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import SearchOverlay from './SearchOverlay.tsx';
import StagingBanner from './StagingBanner.tsx';
import DirectorCreditsModal from './DirectorCreditsModal.tsx';

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
              />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </a>
    );
}

const MoviePage: React.FC<MoviePageProps> = ({ movieKey }) => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Like state
  const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  
  // Title animation state
  const [displayTitle, setDisplayTitle] = useState('');
  const [titleOpacity, setTitleOpacity] = useState(1);
  const [isAnimatingTitle, setIsAnimatingTitle] = useState(false);

  // Player state
  const [playerMode, setPlayerMode] = useState<PlayerMode>('poster');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Always start muted for autoplay compatibility
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWidescreen, setIsWidescreen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Staging and feature toggles
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    // Check for staging environment on mount
    const params = new URLSearchParams(window.location.search);
    const env = params.get('env');
    const stagingSession = sessionStorage.getItem('crateTvStaging');
    const stagingActive = env === 'staging' || stagingSession === 'true';

    if (stagingActive) {
      setIsStaging(true);
    }
    
    const sourceMovie = moviesData[movieKey];
    if (sourceMovie) {
      const movieData = { ...sourceMovie };
       // Check if movie should be visible
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const releaseDate = movieData.releaseDate ? new Date(movieData.releaseDate.replace(/-/g, '/')) : null;
      const isReleased = !releaseDate || releaseDate <= today;

      if (!isReleased && !stagingActive) {
        // Movie not found or not released, and we are not in staging
        window.location.href = '/';
        return; // Stop processing
      }

      // Initialize likes from local storage for this specific movie
      const storedLikes = localStorage.getItem(`cratetv-${movieKey}-likes`);
      if (storedLikes) {
        movieData.likes = parseInt(storedLikes, 10);
      } else {
        movieData.likes = movieData.likes || 0;
      }
      setMovie(movieData);
      setDisplayTitle(movieData.title); // Initialize display title

      // Initialize liked set from local storage
      const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
      if (storedLikedMovies) {
        setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
      }

      // Handle play from URL
      if (params.get('play') === 'true' && movieData.fullMovie) {
        setPlayerMode('full');
        setIsMuted(false);
      } else {
        setPlayerMode('poster');
      }
    } else {
      // Handle movie not found, maybe redirect
      window.location.href = '/';
    }
  }, [movieKey]);

  // SEO and Title Animation
  useEffect(() => {
    let animationTimers: ReturnType<typeof setTimeout>[] = [];
    if (movie) {
        document.title = `${movie.title} | Crate TV`;
        
        // SEO update logic
        const synopsisText = movie.synopsis.replace(/<br\s*\/?>/gi, ' ').trim();
        const pageUrl = `https://cratetv.net/movie/${movie.key}`;
        
        setMetaTag('name', 'description', synopsisText);
        setMetaTag('name', 'keywords', `crate tv, ${movie.title}, ${movie.director}, ${movie.cast.map(a => a.name).join(', ')}, independent film, short film, Philadelphia film, netflix, prime video, hulu, tubi, peacock, indie streaming`);
        setMetaTag('property', 'og:title', `${movie.title} | Crate TV`);
        setMetaTag('property', 'og:description', synopsisText);
        setMetaTag('property', 'og:url', pageUrl);
        setMetaTag('property', 'og:image', movie.poster);
        setMetaTag('property', 'og:type', 'video.movie');
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', `${movie.title} | Crate TV`);
        setMetaTag('name', 'twitter:description', synopsisText);
        setMetaTag('name', 'twitter:image', movie.poster);
        
        const oldSchema = document.getElementById('movie-schema');
        if (oldSchema) oldSchema.remove();
        
        const schema = {
          "@context": "https://schema.org", "@type": "Movie", "name": movie.title,
          "description": synopsisText, "image": movie.poster, "url": pageUrl,
          "director": movie.director.split(',').map(d => d.trim()).filter(Boolean).map(d => ({ "@type": "Person", "name": d })),
          "actor": movie.cast.map(actor => ({ "@type": "Person", "name": actor.name })),
          "provider": { "@type": "Organization", "name": "Crate TV", "url": "https://cratetv.net" }
        };
        const script = document.createElement('script');
        script.id = 'movie-schema'; script.type = 'application/ld+json';
        script.innerHTML = JSON.stringify(schema);
        document.head.appendChild(script);
        
        // --- START: Automatic title animation ---
        if (movie.key === 'unchienandalou') {
            setIsAnimatingTitle(true);

            // 1. Initial delay before starting animation
            animationTimers.push(setTimeout(() => {
                setTitleOpacity(0); // Fade out French

                // 2. Show English
                animationTimers.push(setTimeout(() => {
                    setDisplayTitle('An Andalusian Dog');
                    setTitleOpacity(1); // Fade in English

                    // 3. Hold English
                    animationTimers.push(setTimeout(() => {
                        setTitleOpacity(0); // Fade out English

                        // 4. Show French again
                        animationTimers.push(setTimeout(() => {
                            setDisplayTitle('Un Chien Andalou');
                            setTitleOpacity(1); // Fade in French
                            setIsAnimatingTitle(false);
                        }, 500));
                    }, 2000));
                }, 500));
            }, 1000)); // Start animation 1 second after page load
        } else {
            // Ensure title is correct for other movies
            setDisplayTitle(movie.title);
            setTitleOpacity(1);
        }
        // --- END: Automatic title animation ---

        return () => {
          animationTimers.forEach(clearTimeout);
          const oldSchema = document.getElementById('movie-schema');
          if (oldSchema) oldSchema.remove();
          document.title = 'Crate TV | Home for Independent Films';
        };
    }
  }, [movie]);
  
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Programmatic playback effect
  useEffect(() => {
    if (playerMode !== 'poster' && videoRef.current) {
        videoRef.current.play().catch(error => {
            console.warn("Autoplay was prevented:", error);
            setIsPlaying(false);
        });
    } else if (playerMode === 'poster' && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  }, [playerMode, movie?.key]);


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
      .slice(0, 6);
  }, [movie]);

  const toggleLikeMovie = useCallback(() => {
    if (!movie) return;
    const movieKey = movie.key;

    setLikedMovies(prevLiked => {
        const newLikedMovies = new Set(prevLiked);
        let likesChange = 0;

        if (newLikedMovies.has(movieKey)) {
            newLikedMovies.delete(movieKey);
            likesChange = -1;
        } else {
            newLikedMovies.add(movieKey);
            likesChange = 1;
        }
        
        localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));
        
        setMovie(prevMovie => {
            if (!prevMovie) return null;
            const updatedMovie = { 
                ...prevMovie, 
                likes: Math.max(0, (prevMovie.likes || 0) + likesChange) 
            };
            localStorage.setItem(`cratetv-${movieKey}-likes`, updatedMovie.likes.toString());
            return updatedMovie;
        });

        if (newLikedMovies.has(movieKey)) {
            setIsAnimatingLike(true);
            setTimeout(() => setIsAnimatingLike(false), 500);
        }

        return newLikedMovies;
    });
  }, [movie]);

  const handlePlayMovie = () => {
    setPlayerMode('full');
    setIsMuted(false);
    
    const params = new URLSearchParams(window.location.search);
    params.set('play', 'true');
    const newPath = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newPath);
  };
  
  const exitStaging = () => {
    sessionStorage.removeItem('crateTvStaging');
    const params = new URLSearchParams(window.location.search);
    params.delete('env');
    window.location.search = params.toString();
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
        setDuration(videoRef.current.duration);
        // Check aspect ratio to determine widescreen
        const { videoWidth, videoHeight } = videoRef.current;
        if (videoWidth > 0 && videoHeight > 0) {
            setIsWidescreen(videoWidth / videoHeight > 1.5);
        }
    }
  };
  
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (videoRef.current.duration / 100) * Number(e.target.value);
      videoRef.current.currentTime = newTime;
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
  
  const handleMuteToggle = () => setIsMuted(!isMuted);

  const toggleFullScreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
    } else {
        document.exitFullscreen();
    }
  };

  const handleSelectActor = (actor: Actor) => setSelectedActor(actor);
  const handleCloseActorModal = () => setSelectedActor(null);
  
  const handleSearchSubmit = (query: string) => {
    if (query) {
      window.location.href = `/?search=${encodeURIComponent(query)}`;
    }
  };

  const handleNavigate = (path: string) => {
    // Use relative path directly to avoid issues in sandboxed environments
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
    window.scrollTo(0, 0);
  };

  const handleSelectMovieFromDirector = (selectedMovie: Movie) => {
    setSelectedDirector(null);
    handleNavigate(`/movie/${selectedMovie.key}`);
  };

  const videoSource = movie?.fullMovie;
  const isLiked = movie ? likedMovies.has(movie.key) : false;

  if (!movie) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white">
      {isStaging && <StagingBanner onExit={exitStaging} />}
      <Header 
        searchQuery={searchQuery} 
        onSearch={setSearchQuery} 
        isScrolled={true}
        onMobileSearchClick={() => setIsMobileSearchOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        isStaging={isStaging}
      />
      
      <main className="flex-grow">
        <div ref={videoContainerRef} className={`relative w-full bg-black group/video transition-all duration-300 ${playerMode !== 'poster' ? 'aspect-video' : 'h-[56.25vw] max-h-[85vh]'}`}>
            {playerMode === 'poster' ? (
                <div className="relative w-full h-full overflow-hidden">
                    <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    key={videoSource}
                    className={`w-full h-full ${isWidescreen ? 'object-cover' : 'object-contain'}`}
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    onClick={togglePlayPause}
                >
                    <source src={videoSource} type="video/mp4" />
                </video>
            )}

            {playerMode === 'poster' && (
                <div className="absolute bottom-[12%] md:bottom-[20%] left-8 md:left-12 text-white z-10 max-w-xl animate-fadeInHeroContent">
                    <h1 
                        className="text-3xl md:text-6xl font-bold drop-shadow-lg transition-opacity duration-500"
                        style={{ opacity: titleOpacity }}
                    >
                        {displayTitle}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        {movie.fullMovie && (
                             <button onClick={handlePlayMovie} className="flex items-center justify-center px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                Play Movie
                            </button>
                        )}
                        <button onClick={toggleLikeMovie} className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition" aria-label="Like">
                            <svg xmlns="http://www.w3.org/2000/svg" 
                                className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'} ${isAnimatingLike ? 'animate-heartbeat' : ''}`}
                                fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
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
                    <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                     <div className="mt-6 bg-gradient-to-r from-red-500/10 to-blue-500/10 p-3 rounded-lg text-center border border-gray-700">
                        <p className="text-sm text-white">✨ Click an actor's name for their bio & an AI-generated fun fact!</p>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Cast</h3>
                    <div className="space-y-2 text-white">
                        {movie.cast.map((actor) => (
                            <p key={actor.name} className="group cursor-pointer" onClick={() => handleSelectActor(actor)}>
                                <span className="group-hover:text-red-400 transition">{actor.name}</span>
                            </p>
                        ))}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mt-4 mb-2">Director</h3>
                    <div className="space-y-2 text-white">
                        {movie.director.split(',').map(name => name.trim()).filter(Boolean).map(directorName => (
                            <p key={directorName} className="group cursor-pointer" onClick={() => setSelectedDirector(directorName)}>
                                <span className="group-hover:text-red-400 transition">{directorName}</span>
                            </p>
                        ))}
                    </div>
                 </div>
            </div>

            {recommendedMovies.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-700">
                <h3 className="text-2xl font-bold mb-4">More Like This</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recommendedMovies.map(recMovie => (
                    <RecommendedMovieLink key={recMovie.key} movie={recMovie} />
                  ))}
                </div>
              </div>
            )}
        </div>
      </main>

      <Footer />
      <BackToTopButton />
      
      {selectedActor && (
          <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
      )}
      {selectedDirector && (
        <DirectorCreditsModal
            directorName={selectedDirector}
            onClose={() => setSelectedDirector(null)}
            allMovies={moviesData}
            onSelectMovie={handleSelectMovieFromDirector}
        />
      )}
      {isMobileSearchOpen && (
        <SearchOverlay 
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onClose={() => setIsMobileSearchOpen(false)}
          onSubmit={(query) => {
            handleSearchSubmit(query);
            setIsMobileSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default MoviePage;