import React, { useState, useEffect } from 'react';
import { Movie } from '../types.ts';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Reset loaded state when movie prop changes, ensuring the effect re-runs for new cards
  useEffect(() => {
    setIsLoaded(false);
  }, [movie.key]);

  return (
    <div
      className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105"
      onClick={() => onSelectMovie(movie)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${movie.title}`}
      onKeyPress={(e) => e.key === 'Enter' && onSelectMovie(movie)}
    >
      {/* Placeholder Image: Blurry and visible by default */}
      <img
        src={movie.posterPlaceholder || ''}
        alt="" // Placeholder is decorative, so alt text is empty
        aria-hidden="true"
        className={`w-full h-full object-cover blur-md scale-105 transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {/* High-Quality Image: Invisible by default, fades in on load */}
      <img
        src={movie.poster}
        alt={movie.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

export default MovieCard;