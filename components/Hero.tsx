import React from 'react';
import { Movie } from '../types.ts';
import Countdown from './Countdown.tsx';
import { isMovieReleased } from '../constants.ts';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onSelectMovie: (movie: Movie) => void;
  hideControls?: boolean;
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onSelectMovie, hideControls = false }) => {
  const movie = movies[currentIndex];
  
  if (!movie) {
    return <div className="h-[56.25vw] max-h-[85vh] w-full bg-black" />;
  }
  
  const released = isMovieReleased(movie);
  const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
  const isHalloweenRelease = releaseDate ? releaseDate.getMonth() === 9 && releaseDate.getDate() === 31 : false;


  return (
    <div
      className="relative h-[56.25vw] max-h-[85vh] w-full bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `url(${movie.poster})` }}
      role="banner"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
      
      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-10 md:p-12 md:pb-16 lg:p-24">
        <div key={movie.key} className="max-w-xl animate-fadeInHeroContent p-6 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)' }}>
          <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">{movie.title}</h1>
          
          {!released && movie.releaseDateTime && (
            <div className="mb-4 inline-flex flex-col items-start gap-2">
                {isHalloweenRelease && (
                    <div className="inline-flex items-center gap-2 rounded-md bg-orange-600/90 px-4 py-2 font-bold text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm-1 2v4h2V4h-2zm-3.5 7.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3.5 6c-1.33 0-2.67-.83-3.5-2v1.5h7V17c-.83 1.17-2.17 2-3.5 2z" />
                        </svg>
                        <span className="text-lg">Premieres Halloween!</span>
                    </div>
                )}
                <div className="inline-flex items-center gap-2 rounded-md bg-red-600/80 px-4 py-2 font-bold text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <Countdown targetDate={movie.releaseDateTime} className="text-sm" />
                </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 mt-4">
            {/* Desktop Button */}
            <button
              onClick={() => onSelectMovie(movie)}
              className="hidden md:flex items-center justify-center px-6 py-2.5 rounded-md bg-gray-500/50 text-white font-bold hover:bg-gray-400/50 transition-colors shadow-lg backdrop-blur-sm"
              aria-label={`More information about ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V11M12 8h.01" />
              </svg>
              <span>More Info</span>
            </button>
            {/* Mobile Button */}
            <button
              onClick={() => onSelectMovie(movie)}
              className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-gray-500/50 text-white font-bold hover:bg-gray-400/50 transition-colors shadow-lg backdrop-blur-sm"
              aria-label={`More information about ${movie.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V11M12 8h.01" />
              </svg>
            </button>
          </div>
        </div>
      </div>
       {!hideControls && (
        <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 flex space-x-3">
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
       )}
    </div>
  );
};

export default Hero;
