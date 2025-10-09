import React, { useState, useEffect } from 'react';
import { Movie } from '../types';
import Countdown from './Countdown';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
  const [isReleased, setIsReleased] = useState(() => {
    const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
    return !releaseDate || releaseDate <= new Date();
  });

  useEffect(() => {
    const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
    setIsReleased(!releaseDate || releaseDate <= new Date());
  }, [movie.releaseDateTime]);

  const handleCountdownEnd = () => {
    // A little delay to ensure the date comparison is correct and avoid flicker
    setTimeout(() => setIsReleased(true), 1000);
  };
  
  return (
    <div
      className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105 group"
      onClick={() => onSelectMovie(movie)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${movie.title}`}
      onKeyPress={(e) => e.key === 'Enter' && onSelectMovie(movie)}
    >
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full h-full object-cover"
        loading="lazy"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {!isReleased && movie.releaseDateTime && (
         <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <Countdown 
              targetDate={movie.releaseDateTime} 
              onEnd={handleCountdownEnd} 
              className="text-white font-bold text-sm"
            />
         </div>
      )}
    </div>
  );
};

export default MovieCard;