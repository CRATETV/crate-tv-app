

import React, { useState } from 'react';
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

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimatingLike(true);
    setTimeout(() => setIsAnimatingLike(false), 500); // Duration of the heartbeat animation
    onToggleLike?.(movie.key);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchlist?.(movie.key);
  };

  const handleSupport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSupportMovie?.(movie);
  }

  return (
    <div
      className="group relative cursor-pointer aspect-[2/3] rounded-md overflow-hidden bg-transparent transition-transform duration-300 ease-in-out hover:scale-105 hover:z-10"
      onClick={() => onSelectMovie(movie)}
    >
      {!isImageLoaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse"></div>
      )}
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt={movie.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setIsImageLoaded(true)}
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin="anonymous"
      />
      
      {isComingSoon && (
        <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm z-10">
          COMING SOON
        </div>
      )}

      {isWatched && (
        <div className="absolute top-2 right-2 bg-red-600/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm z-10">
          WATCHED
        </div>
      )}
      {/* This overlay now contains the synopsis which is hidden on mobile and appears on desktop hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
         <p 
            className="text-gray-300 text-xs line-clamp-3 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}
        ></p>
        <div className="flex items-end justify-end">
            <div className="flex items-center gap-2 flex-shrink-0">
                {onToggleWatchlist && (
                <button onClick={handleToggleWatchlist} className="p-1.5 rounded-full bg-black/50 hover:bg-white/20" title={isOnWatchlist ? "Remove from My List" : "Add to My List"}>
                    {isOnWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    )}
                </button>
                )}
                {!isComingSoon && onToggleLike && (
                    <button onClick={handleToggleLike} className={`p-1.5 rounded-full bg-black/50 hover:bg-red-500/80 ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                )}
                {!isComingSoon && onSupportMovie && !movie.hasCopyrightMusic && (
                    <button onClick={handleSupport} className="p-1.5 rounded-full bg-black/50 hover:bg-purple-600/80 text-purple-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};