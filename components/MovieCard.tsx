import React from 'react';
import { Movie } from '../types';
import { isMovieReleased } from '../constants';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  showRank?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, showRank }) => {
  if (!movie) {
    return null;
  }

  const released = isMovieReleased(movie);

  return (
    <div
      className="group relative cursor-pointer rounded-md overflow-hidden aspect-[3/4] bg-gray-900"
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
      {showRank && (
          <div className="absolute top-2 left-2 w-8 h-8 bg-red-600/90 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {showRank}
          </div>
      )}
    </div>
  );
};

export default MovieCard;
