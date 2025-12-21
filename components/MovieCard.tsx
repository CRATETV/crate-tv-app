
import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  isWatched?: boolean;
  isOnWatchlist?: boolean;
  isLiked?: boolean;
  onToggleLike?: (movieKey: string) => void;
  onToggleWatchlist?: (movieKey: string) => void;
  onSupportMovie?: (movie: Movie) => void;
  isComingSoon?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, isWatched, isOnWatchlist, isLiked, onToggleLike, onToggleWatchlist, onSupportMovie, isComingSoon }) => {
  if (!movie) return null;
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimatingLike(true);
    setTimeout(() => setIsAnimatingLike(false), 500);
    onToggleLike?.(movie.key);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchlist?.(movie.key);
  };

  const handleSupport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSupportMovie?.(movie);
  };

  const handleMouseEnter = () => {
    if (isComingSoon || (!movie.trailer && !movie.fullMovie)) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 700);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const videoSrc = movie.trailer || movie.fullMovie;

  if (!movie.poster) {
    return (
        <div
          className="group relative cursor-pointer aspect-[3/4] rounded-md overflow-hidden bg-gray-900 flex flex-col items-center justify-center p-3 text-center border border-white/5 transition-transform duration-300 hover:scale-105"
          onClick={() => onSelectMovie(movie)}
        >
          <p className="text-white font-bold text-sm">{movie.title}</p>
        </div>
    );
  }

  return (
    <div
      className="group relative cursor-pointer aspect-[3/4] rounded-md overflow-hidden bg-transparent transition-all duration-400 ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-110 hover:z-20 movie-card-glow border border-white/5"
      onClick={() => onSelectMovie(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isImageLoaded && (
        <div className="absolute inset-0 shimmer-bg"></div>
      )}
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt={movie.title}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'} ${showPreview ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setIsImageLoaded(true)}
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin="anonymous"
      />
      
      {showPreview && videoSrc && (
        <div className="absolute inset-0 bg-black animate-[fadeIn_0.4s_ease-out]">
            <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
            />
            <div className="absolute bottom-2 right-2 bg-black/60 p-1 rounded-full pointer-events-none backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
      )}
      
      {isComingSoon && (
        <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-[10px] font-black tracking-tighter px-1.5 py-0.5 rounded shadow-lg z-10 uppercase">
          Coming Soon
        </div>
      )}

      {isWatched && (
        <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[10px] font-black tracking-tighter px-1.5 py-0.5 rounded shadow-lg z-10 uppercase">
          Watched
        </div>
      )}

      <div className={`absolute inset-0 bg-gradient-to-t from-black/100 via-black/20 to-transparent p-4 flex flex-col justify-end transition-opacity duration-300 ${showPreview ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
         <h4 className="text-white font-bold text-sm mb-1 truncate">{movie.title}</h4>
         <p className="text-gray-300 text-[10px] line-clamp-2 mb-3 leading-tight font-medium" dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}></p>
         
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {onToggleWatchlist && (
                <button onClick={handleToggleWatchlist} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors" title={isOnWatchlist ? "Remove from My List" : "Add to My List"}>
                    {isOnWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    )}
                </button>
                )}
                {!isComingSoon && onToggleLike && (
                    <button onClick={handleToggleLike} className={`p-1.5 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 transition-all ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                )}
            </div>
            {!isComingSoon && onSupportMovie && !movie.hasCopyrightMusic && (
                <button onClick={handleSupport} className="p-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                    </svg>
                </button>
            )}
         </div>
      </div>
    </div>
  );
};
