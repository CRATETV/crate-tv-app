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

  // Special layout for ranked "Top 10" movies, inspired by the user's request.
  if (rank) {
    return (
      <div
        className="group relative h-full w-full cursor-pointer flex items-stretch bg-black rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 shadow-lg"
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900/80 to-transparent z-10"></div>
        
        {/* Left Side: Rank and Title */}
        <div className="relative z-20 flex-shrink-0 w-2/5 flex flex-col justify-between p-4">
          <span 
            className="font-black text-8xl lg:text-9xl text-gray-800 select-none"
            style={{ WebkitTextStroke: '2px rgba(150,150,150,0.2)' }}
            aria-hidden="true"
          >
            {rank}
          </span>
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white transition-transform duration-300 transform group-hover:-translate-y-1">
              {movie.title}
            </h3>
            <p className="text-sm text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Click to view
            </p>
          </div>
        </div>

        {/* Right Side: Poster */}
        <div className="relative w-3/5">
          <img
            src={movie.poster}
            alt="" // Decorative
            className="w-full h-full object-cover"
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