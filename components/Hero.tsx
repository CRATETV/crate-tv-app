
import React from 'react';
import { Movie } from '../types';

interface HeroProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movie, onSelectMovie, onPlayMovie }) => {
  if (!movie) {
    return <div className="h-[56.25vw] max-h-[80vh] w-full bg-black" />;
  }

  return (
    <div 
      className="relative h-[56.25vw] max-h-[80vh] w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${movie.poster})` }}
      aria-labelledby="hero-movie-title"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
      <div className="absolute inset-0 flex flex-col justify-center p-4 md:p-12 lg:p-24">
        <div className="max-w-xl">
          <h1 id="hero-movie-title" className="text-4xl md:text-6xl font-bold text-white shadow-lg">
            {movie.title}
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/90 shadow-lg max-w-prose line-clamp-3">
            {movie.synopsis.replace(/<br\s*\/?>/gi, ' ')}
          </p>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => onPlayMovie(movie)}
              className="flex items-center justify-center px-6 py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors"
              aria-label={`Play ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play
            </button>
            <button
              onClick={() => onSelectMovie(movie)}
              className="flex items-center justify-center px-6 py-3 bg-gray-500/70 text-white font-bold rounded-md hover:bg-gray-500/90 transition-colors"
              aria-label={`More information about ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
