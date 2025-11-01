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
        className="group relative h-full w-full cursor-pointer flex items-center"
        onClick={() => onSelectMovie(movie)}
        role="button"
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') onSelectMovie(movie)}}
      >
        {/* Giant Number */}
        <span 
          className="font-black text-[8rem] md:text-[10rem] lg:text-[12rem] leading-none select-none transition-transform duration-300 group-hover:scale-105"
          style={{ WebkitTextStroke: '2px white', color: '#141414', textStroke: '2px white' }}
        >
          {rank}
        </span>
        
        {/* Poster, overlapping the number */}
        <div className="absolute left-[30%] w-[70%] h-full rounded-md overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-2">
             <img
                src={movie.poster}
                alt={""} // Decorative
                className="w-full h-full object-cover"
                loading="lazy"
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>

        {/* 'Coming Soon' overlay if not released */}
        {!released && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center p-2 z-30 backdrop-blur-sm rounded-md">
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