import React from 'react';
import { Movie } from '../types';
import { isMovieReleased } from '../constants';

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

  // Special layout for ranked "Top 10" movies, inspired by Hulu/Netflix
  if (rank) {
    const rankBorders = [
        'border-yellow-400/80 shadow-lg shadow-yellow-900/50', // Gold
        'border-slate-300/50', // Silver
        'border-orange-600/50', // Bronze
    ];
    const defaultBorder = 'border-gray-700/50';
    const borderClass = rank <= 3 ? rankBorders[rank - 1] : defaultBorder;
    
    return (
      <div
        className={`group relative h-full w-full cursor-pointer flex items-stretch bg-black rounded-lg overflow-hidden border-2 transition-all duration-300 ${borderClass} hover:border-white/80 hover:scale-105`}
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        {/* Number on the left */}
        <div className="flex-shrink-0 w-[45%] flex items-center justify-start">
            <span 
                className="font-black text-[10rem] md:text-[12rem] leading-none select-none text-gray-800 group-hover:text-gray-700 transition-all duration-300 -ml-4 md:-ml-6"
                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                aria-hidden="true"
            >
                {rank}
            </span>
        </div>
        
        {/* Poster on the right, overlapping */}
        <div className="w-[65%] flex-shrink-0 -ml-[10%] group-hover:-ml-[5%] transition-all duration-300 shadow-2xl shadow-black rounded-r-lg">
            <img
                src={movie.poster}
                alt="" // Decorative
                className="w-full h-full object-cover rounded-r-lg"
                loading="lazy"
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
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