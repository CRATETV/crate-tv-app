import React, { useState, useEffect } from 'react';
import { Movie } from '../types';
import Countdown from './Countdown';
import { isMovieReleased } from '../constants';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  rank?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, rank }) => {
  const [released, setReleased] = useState(() => isMovieReleased(movie));

  useEffect(() => {
    if (released) return;
    if (isMovieReleased(movie)) {
      setReleased(true);
      return;
    }
    const interval = setInterval(() => {
      if (isMovieReleased(movie)) {
        setReleased(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [movie, released]);

  const handleCountdownEnd = () => {
    setTimeout(() => setReleased(true), 1000);
  };
  
  const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
  const isHalloweenRelease = releaseDate ? releaseDate.getMonth() === 9 && releaseDate.getDate() === 31 : false;
  
  const posterContent = (
    <>
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-full h-full object-cover"
        loading="lazy"
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      {!released && movie.releaseDateTime && (
         <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]">
            {isHalloweenRelease ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-400 mb-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm-1 2v4h2V4h-2zm-3.5 7.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3.5 6c-1.33 0-2.67-.83-3.5-2v1.5h7V17c-.83 1.17-2.17 2-3.5 2z" />
                </svg>
                <p className="text-base font-bold text-orange-300">Debuts on Halloween</p>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white mb-2 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                <p className="text-base font-bold text-white">Coming Soon</p>
              </>
            )}
            <Countdown 
              targetDate={movie.releaseDateTime} 
              onEnd={handleCountdownEnd} 
              className="text-white font-bold text-sm mt-1"
            />
         </div>
      )}
    </>
  );

  if (rank) {
    return (
       <div
        className="flex items-center group cursor-pointer h-full"
        onClick={() => onSelectMovie(movie)}
        role="button" tabIndex={0}
        aria-label={`View details for ${movie.title}, ranked number ${rank}`}
        onKeyPress={(e) => e.key === 'Enter' && onSelectMovie(movie)}
      >
        <div 
          className="text-[6rem] sm:text-[7rem] md:text-[8rem] font-black text-white transition-transform duration-300 ease-in-out group-hover:scale-110"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)', WebkitTextStroke: '3px #141414', paintOrder: 'stroke fill' }}
          aria-hidden="true"
        >
          {rank}
        </div>
        <div className="relative w-28 sm:w-32 md:w-40 aspect-[3/4] rounded-md overflow-hidden bg-gray-900 transition-transform duration-300 ease-in-out group-hover:scale-110 -ml-4 sm:-ml-5 md:-ml-6 shadow-lg">
          {posterContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105 group"
      onClick={() => onSelectMovie(movie)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${movie.title}`}
      onKeyPress={(e) => e.key === 'Enter' && onSelectMovie(movie)}
    >
      {posterContent}
    </div>
  );
};

export default MovieCard;