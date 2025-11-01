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
    return (
      <div
        className="group relative h-full w-full cursor-pointer flex items-stretch bg-black rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105"
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        <img
            src={movie.poster}
            alt="" // Decorative
            className="w-full h-full object-cover"
            loading="lazy"
            onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="flex items-end gap-2">
             <span 
                className="font-black text-6xl leading-none select-none text-white/80"
                style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}
                aria-hidden="true"
            >
                {rank}
            </span>
             <h3 className="text-lg font-bold leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-y-0 translate-y-2">
                {movie.title}
             </h3>
          </div>
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