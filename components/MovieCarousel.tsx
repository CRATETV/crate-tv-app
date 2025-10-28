import React, { useRef, useState, useEffect } from 'react';
import { Movie } from '../types';
import MovieCard from './MovieCard';

interface MovieCarouselProps {
  title: React.ReactNode;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  showRankings?: boolean;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies, onSelectMovie, showRankings }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const checkScrollPosition = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const atStart = el.scrollLeft === 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5; // 5px buffer
      setIsAtStart(atStart);
      setIsAtEnd(atEnd);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
        checkScrollPosition();
        el.addEventListener('scroll', checkScrollPosition);
        window.addEventListener('resize', checkScrollPosition);

        return () => {
            el.removeEventListener('scroll', checkScrollPosition);
            window.removeEventListener('resize', checkScrollPosition);
        };
    }
  }, [movies]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.9;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper to render the title. If it's a string, wrap it in a default h2.
  // If it's already a React component, render it as-is.
  const renderTitle = () => {
    if (!title) return null;
    if (typeof title === 'string') {
        return <h2 className="text-lg md:text-2xl font-bold mb-4 text-white hover:text-gray-300 transition-colors cursor-pointer">{title}</h2>;
    }
    return <>{title}</>;
  }

  return (
    <div 
      className="mb-8 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderTitle()}
      
      <div className="relative">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto overflow-y-visible space-x-2 md:space-x-4 py-4 scrollbar-hide"
        >
          {movies.map((movie, index) => (
            <div key={movie.key} className={`flex-shrink-0 ${showRankings ? 'w-44 md:w-56' : 'w-40 md:w-48'}`}>
                <MovieCard
                  movie={movie}
                  onSelectMovie={onSelectMovie}
                  rank={showRankings ? index + 1 : undefined}
                />
            </div>
          ))}
        </div>

        {!isAtStart && (
          <button 
            onClick={() => handleScroll('left')}
            className={`absolute -left-5 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-opacity duration-300 hidden md:flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        {!isAtEnd && (
          <button 
            onClick={() => handleScroll('right')}
            className={`absolute -right-5 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-opacity duration-300 hidden md:flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCarousel;