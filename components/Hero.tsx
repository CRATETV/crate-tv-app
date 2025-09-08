import React from 'react';
import { Movie } from '../types.ts';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onSelectMovie: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onSelectMovie }) => {
  const movie = movies[currentIndex];

  if (!movie) {
    return <div className="h-[56.25vw] max-h-[85vh] w-full bg-black" />;
  }

  return (
    <div 
      className="relative h-[56.25vw] max-h-[85vh] w-full bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `url(${movie.poster})` }}
      aria-labelledby="hero-movie-title"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>

      <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12 lg:p-24">
        <div key={movie.key} className="max-w-xl animate-fadeInHeroContent mt-8 md:mt-0">
          <h1 id="hero-movie-title" className="text-3xl sm:text-4xl md:text-6xl font-bold text-white shadow-lg">
            {movie.title}
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/90 shadow-lg max-w-prose line-clamp-3">
            {movie.synopsis.replace(/<br\s*\/?>/gi, ' ')}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => onSelectMovie(movie)}
              className="flex items-center justify-center p-2 rounded-full sm:px-8 sm:py-3 sm:rounded-md sm:text-base bg-gray-500/60 text-white font-bold hover:bg-gray-500/40 transition-colors"
              aria-label={`More information about ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">More Info</span>
            </button>
          </div>
        </div>
      </div>
       <div className="absolute bottom-12 right-12 flex space-x-3">
        {movies.map((_, index) => (
          <button
            key={index}
            aria-label={`Go to featured movie ${index + 1}`}
            onClick={() => onSetCurrentIndex(index)}
            className={`w-3 h-1 sm:w-4 sm:h-1 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'bg-white/90' : 'bg-white/40 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;