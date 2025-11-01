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
    const year = movie.releaseDateTime ? new Date(movie.releaseDateTime).getFullYear() : null;

    const rankGradients = [
        'from-yellow-400/30 via-black/20 to-transparent', // Gold for #1
        'from-slate-300/30 via-black/20 to-transparent', // Silver for #2
        'from-orange-600/30 via-black/20 to-transparent', // Bronze for #3
    ];
    const rankBorders = [
        'border-yellow-400/80 shadow-lg shadow-yellow-900/50', // Gold
        'border-slate-300/50', // Silver
        'border-orange-600/50', // Bronze
    ];
    const defaultGradient = 'from-gray-700/30 via-black/20 to-transparent';
    const defaultBorder = 'border-gray-700/50';

    const gradientClass = rank <= 3 ? rankGradients[rank - 1] : defaultGradient;
    const borderClass = rank <= 3 ? rankBorders[rank - 1] : defaultBorder;
    
    return (
      <div
        className={`group relative h-full w-full cursor-pointer flex items-center bg-black rounded-lg overflow-hidden border-2 transition-all duration-300 ${borderClass} hover:border-white/80 hover:scale-105`}
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} opacity-80 group-hover:opacity-100`}></div>
        
        {/* Giant Number (behind everything) */}
        <div className="absolute -left-4 md:-left-8 bottom-0 h-full w-1/2 flex items-center">
             <span 
                className="font-black text-[12rem] md:text-[16rem] lg:text-[20rem] leading-none select-none transition-transform duration-500 group-hover:scale-110"
                style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)', color: 'transparent' }}
                aria-hidden="true"
            >
                {rank}
            </span>
        </div>
        
        {/* Text content on the left */}
        <div className="relative z-10 w-[55%] h-full flex flex-col justify-end p-4 md:p-6 text-white">
            <p className="text-xs font-bold tracking-widest opacity-80 mb-1 md:mb-2">START WATCHING</p>
        </div>

        {/* Poster on the right, overlapping */}
        <div className="absolute right-0 top-0 h-full w-[60%]">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/50 to-black"></div>
            <img
                src={movie.poster}
                alt="" // Decorative
                className="w-full h-full object-cover"
                loading="lazy"
                style={{ maskImage: 'linear-gradient(to left, black 80%, transparent 100%)' }}
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