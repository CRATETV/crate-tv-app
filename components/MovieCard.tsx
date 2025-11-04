
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

  // A set of movie keys for posters that have a wider aspect ratio where text might get cut off.
  // These will use `object-contain` instead of `object-cover`.
  const widePosterKeys = new Set([
    'theneighbours',
    'results',
    'almasvows',
    'newmovie1756485973547', // Burst
    'drive',
    'fatherdaughterdance',
    'newmovie1756487390550', // I Still Love Her
    'itsinyou',
    'newmovie1756486933392', // Power Trip
    'newmovie1756487626529', // Strange Encounters
    'tedandnatalie',
    'unhinged',
    'wrapitup'
  ]);

  const isWidePoster = widePosterKeys.has(movie.key);
  const imageFitClass = isWidePoster ? 'object-contain' : 'object-cover';

  // Special layout for ranked movies (Top 10)
  if (rank) {
    return (
      <div 
        onClick={() => onSelectMovie(movie)} 
        className="group flex items-center cursor-pointer h-full"
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
        role="button"
        aria-label={`Rank ${rank}: ${movie.title}`}
      >
        <span 
          className="font-black text-6xl md:text-8xl leading-none select-none transition-transform duration-300 group-hover:-translate-x-2 text-gray-800 group-hover:text-gray-700"
          style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}
        >
          {rank}
        </span>
        <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2 ml-[-1.5rem] md:ml-[-2rem] ranked-card-border" style={{'--rank-color': '#4a044e'} as React.CSSProperties}>
          <img
            src={movie.poster}
            alt={movie.title}
            className={`w-full h-full object-cover`}
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
        className={`w-full h-full ${imageFitClass} transition-transform duration-300 group-hover:scale-105`}
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
