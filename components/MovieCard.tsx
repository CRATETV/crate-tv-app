import React from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  isWatched?: boolean;
  isOnWatchlist?: boolean;
  isLiked?: boolean;
  onToggleLike?: (movieKey: string) => void;
  onSupportMovie?: (movie: Movie) => void;
}

// Set of movie keys that have wide-format posters and need 'object-contain'
// to prevent text from being cropped.
const widePosterKeys = new Set([
  'theneighbours',
  'newmovie1756485973547', // Burst
  'unhinged',
  'fatherdaughterdance',
  'newmovie1756487390550', // I Still Love Her
  'itsinyou',
  'newmovie1756486933392', // Power Trip
  'newmovie1756487626529', // Strange Encounters
  'wrapitup',
  'tedandnatalie',
  'thefallofthehouseofusher',
]);


export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, isWatched, isOnWatchlist, isLiked, onToggleLike, onSupportMovie }) => {
  if (!movie) return null;

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLike?.(movie.key);
  };

  const handleSupport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSupportMovie?.(movie);
  }

  const imageFitClass = widePosterKeys.has(movie.key) ? 'object-contain' : 'object-cover';

  return (
    <div
      className="group relative cursor-pointer aspect-[2/3] rounded-md overflow-hidden bg-gray-800 transition-transform duration-300 ease-in-out hover:scale-105 hover:z-10"
      onClick={() => onSelectMovie(movie)}
    >
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt={movie.title}
        className={`w-full h-full ${imageFitClass}`}
        loading="lazy"
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin="anonymous"
      />
      {isOnWatchlist && (
        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5" title="On My List">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
        </div>
      )}
      {isWatched && (
        <div className="absolute bottom-1 left-1 bg-red-600/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">
          WATCHED
        </div>
      )}
      {/* This overlay now contains the synopsis which is hidden on mobile and appears on desktop hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
         <p 
            className="text-gray-300 text-xs line-clamp-3 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}
        ></p>
        <div className="flex items-end justify-between">
            <h3 className="text-white font-bold text-sm truncate pr-2">{movie.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
                {onToggleLike && (
                    <button onClick={handleToggleLike} className="p-1.5 rounded-full bg-black/50 hover:bg-red-500/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                )}
                {onSupportMovie && !movie.hasCopyrightMusic && (
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