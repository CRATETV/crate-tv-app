import React from 'react';
import { Movie } from '../types.ts';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onSelectMovie, onPlayMovie }) => {
  const movie = movies[currentIndex];

  if (!movie) {
    return <div className="h-[56.25vw] max-h-[80vh] w-full bg-black" />;
  }

  return (
    <div 
      className="relative h-[56.25vw] max-h-[80vh] w-full bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `url(${movie.poster})` }}
      aria-labelledby="hero-movie-title"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
      <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-12 lg:p-24">
        <div key={movie.key} className="max-w-xl animate-fadeInHeroContent">
          <h1 id="hero-movie-title" className="text-3xl sm:text-4xl md:text-6xl font-bold text-white shadow-lg">
            {movie.title}
          </h1>
          <p className="mt-4 text-xs sm:text-sm md:text-base text-white/90 shadow-lg max-w-prose line-clamp-3">
            {movie.synopsis.replace(/<br\s*\/?>/gi, ' ')}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => onPlayMovie(movie)}
              className="flex items-center justify-center px-5 py-2 sm:px-6 sm:py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors"
              aria-label={`Play ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play
            </button>
            <button
              onClick={() => onSelectMovie(movie)}
              className="flex items-center justify-center px-5 py-2 sm:px-6 sm:py-3 bg-gray-500/70 text-white font-bold rounded-md hover:bg-gray-500/90 transition-colors"
              aria-label={`More information about ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              More Info
            </button>
          </div>
        </div>
      </div>
       <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
        {movies.map((_, index) => (
          <button
            key={index}
            aria-label={`Go to featured movie ${index + 1}`}
            onClick={() => onSetCurrentIndex(index)}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;