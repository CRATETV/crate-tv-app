import React, { useState } from 'react';
import { Movie } from '../types.ts';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div
      className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-800 transition-transform duration-300 ease-in-out hover:scale-105"
      onClick={() => onSelectMovie(movie)}
    >
        {/* Skeleton Loader */}
        {!isLoaded && (
            <div className="absolute inset-0 bg-gray-700 animate-pulse-bg"></div>
        )}
        <img 
          src={movie.poster} 
          alt={movie.title} 
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
        />
    </div>
  );
};

export default MovieCard;