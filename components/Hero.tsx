
import React from 'react';
import { Movie } from '../types';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onPlayMovie: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onPlayMovie, onMoreInfo }) => {
  if (!movies || movies.length === 0) {
    return <div className="w-full h-[56.25vw] bg-gray-900 animate-pulse"></div>;
  }

  const currentMovie = movies[currentIndex];

  return (
    <div className="relative w-full h-[56.25vw] max-h-[80vh] bg-black">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          key={currentMovie.key}
          src={currentMovie.poster}
          alt="" // Decorative
          className="w-full h-full object-cover animate-[fadeIn_1s_ease-in-out]"
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Darkened top gradient for better header contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/80"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 text-white">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 max-w-xl animate-[slideInUp_0.5s_ease-out] drop-shadow-lg">
          {currentMovie.title}
        </h1>
        <p className="text-sm md:text-base lg:text-lg max-w-xl mb-6 animate-[slideInUp_0.7s_ease-out] line-clamp-3" dangerouslySetInnerHTML={{ __html: currentMovie.synopsis }}></p>
        <div className="flex items-center gap-4 animate-[slideInUp_0.9s_ease-out]">
          <button
            onClick={() => onPlayMovie(currentMovie)}
            className="flex items-center justify-center px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
          <button
            onClick={() => onMoreInfo(currentMovie)}
            className="flex items-center justify-center px-6 py-2 bg-gray-500/70 backdrop-blur-sm text-white font-bold rounded-md hover:bg-gray-500/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            More Info
          </button>
        </div>
      </div>

      {/* Navigation Dots - now hidden on mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => onSetCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;
