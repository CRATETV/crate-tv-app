import React from 'react';
import { Movie } from '../types.ts';
import { isMovieReleased } from '../constants.ts';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  rank?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, rank }) => {
  if (!movie) {
    return null;
  }

  const released = isMovieReleased(movie);

  // Special layout for ranked "Top 10" movies, based on the Netflix reference
  if (rank) {
    return (
      <div
        className="group relative h-full w-full cursor-pointer rounded-md overflow-hidden transition-all duration-300 shadow-lg bg-gray-900 border-2 border-transparent hover:border-yellow-400"
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        {/* Container for Number and Text */}
        <div className="absolute inset-y-0 left-0 w-7/12 flex flex-col justify-center p-4 z-20">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1 transition-colors duration-300 group-hover:text-yellow-400">Start Watching</p>
            <h3 className="text-white text-xl font-bold drop-shadow-lg line-clamp-3">{movie.title}</h3>
        </div>
        
        {/* Giant Number (behind poster and text) */}
        <div className="absolute inset-0 flex items-center justify-start pointer-events-none z-10">
            <span 
                className="font-black text-[18rem] -ml-8 leading-none select-none text-white/5 transition-all duration-500 group-hover:text-white/10 group-hover:scale-105"
            >
                {rank}
            </span>
        </div>
        
        {/* Poster on the right, overlapping the number */}
        <div className="absolute top-0 right-0 h-full w-8/12 z-0">
             <img
                src={movie.poster}
                alt={""} // Decorative
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onContextMenu={(e) => e.preventDefault()}
            />
            {/* Gradient to blend the poster into the background */}
             <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent"></div>
        </div>

        {/* 'Coming Soon' overlay if not released */}
        {!released && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center p-2 z-30 backdrop-blur-sm">
                <div>
                    <p className="text-white font-bold text-sm">Coming Soon</p>
                </div>
            </div>
        )}
      </div>
    );
  }

  // Standard movie card for all other carousels
  return (
    <div
      className="group relative cursor-pointer rounded-md overflow-hidden aspect-[2/3] bg-gray-900 h-full"
      onClick={() => onSelectMovie(movie)}
      tabIndex={0}
      onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onContextMenu={(e) => e.preventDefault()}
      />
      {!released && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-center p-2">
            <div>
                <p className="text-white font-bold text-sm">Coming Soon</p>
                {movie.releaseDateTime && <p className="text-xs text-gray-400">{new Date(movie.releaseDateTime).toLocaleDateString()}</p>}
            </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

export default MovieCard;
