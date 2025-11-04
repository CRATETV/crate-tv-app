
import React from 'react';
import { Movie } from '../types';
import { isMovieReleased } from '../constants';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
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
