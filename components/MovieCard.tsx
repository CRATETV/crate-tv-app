
import React from 'react';
import { Movie } from '../types';
import { isMovieReleased } from '../constants';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  rank?: number;
  isWatched?: boolean;
  isLiked?: boolean;
  onToggleLike?: (movieKey: string) => void;
  onSupportMovie?: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, rank, isWatched, isLiked, onToggleLike, onSupportMovie }) => {
  if (!movie) {
    return null;
  }

  const released = isMovieReleased(movie);

  const widePosterKeys = new Set([
    'theneighbours', 'results', 'almasvows', 'newmovie1756485973547', // Burst
    'fatherdaughterdance', 'newmovie1756487390550', // I Still Love Her
    'itsinyou', 'newmovie1756486933392', // Power Trip
    'newmovie1756487626529', // Strange Encounters
    'tedandnatalie', 'unhinged', 'wrapitup'
  ]);

  const isWidePoster = widePosterKeys.has(movie.key);
  const imageFitClass = isWidePoster ? 'object-contain' : 'object-cover';

  if (rank) {
    const rankColors = [
      '#FFD700', '#22d3ee', '#CD7F32', '#be123c', '#3b82f6', 
      '#16a34a', '#9333ea', '#f59e0b', '#db2777', '#14b8a6'
    ];
    const color = rankColors[rank - 1] || '#64748B';

    return (
      <div 
        onClick={() => onSelectMovie(movie)} 
        className="group relative aspect-video w-full rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 shadow-lg hover:scale-105"
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
        role="button"
        aria-label={`Rank ${rank}: ${movie.title}`}
        style={{ border: `2px solid ${color}` }}
      >
        <img
          src={movie.poster}
          alt=""
          className="absolute top-0 right-0 h-full w-3/5 object-cover"
          loading="lazy"
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>

        <div className="relative z-10 h-full flex flex-col justify-end p-4 md:p-6 text-white">
          <div className="flex items-end">
            <span 
              className="font-black text-7xl md:text-9xl lg:text-[140px] leading-none select-none text-transparent"
              style={{ WebkitTextStroke: `2px ${color}` }}
            >
              {rank}
            </span>
            <div className="ml-4 mb-2 min-w-0">
              <p className="text-xs md:text-sm font-bold tracking-widest uppercase opacity-75 group-hover:opacity-100 transition-opacity">Start Watching</p>
              <h3 className="text-lg md:text-2xl font-bold truncate">{movie.title}</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard movie card for all other carousels with new hover effect
  return (
    <div
      className="group relative cursor-pointer rounded-md overflow-hidden aspect-[2/3] h-full bg-gray-900"
      onClick={() => onSelectMovie(movie)}
      tabIndex={0}
      onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      <img
        src={movie.poster}
        alt={movie.title}
        className={`w-full h-full ${imageFitClass} transition-transform duration-300 group-hover:scale-105`}
        loading="lazy"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"></div>
      <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
        <h3 className="text-white font-bold text-base truncate">{movie.title}</h3>
        
        {isWatched ? (
          <div className="mt-2 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <p className="text-xs text-gray-400">Enjoyed it? Let the creator know!</p>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike?.(movie.key);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-colors ${isLiked ? 'bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                aria-label={isLiked ? 'Unlike film' : 'Like film'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                {isLiked ? 'Liked' : 'Like'}
              </button>
              {!movie.hasCopyrightMusic && onSupportMovie && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSupportMovie(movie);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  aria-label="Support filmmaker"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" /></svg>
                  Support
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {movie.synopsis && (
              <p className="text-gray-300 text-xs mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            )}
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                <button
                    onClick={(e) => { e.stopPropagation(); onSelectMovie(movie); }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1 px-3 rounded-md"
                >
                    Watch Now
                </button>
            </div>
          </>
        )}
      </div>

      {!released && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-center p-2">
            <div>
                <p className="text-white font-bold text-sm">Coming Soon</p>
                {movie.releaseDateTime && <p className="text-xs text-gray-400">{new Date(movie.releaseDateTime).toLocaleDateString()}</p>}
            </div>
        </div>
      )}
    </div>
  );
};

export default MovieCard;
