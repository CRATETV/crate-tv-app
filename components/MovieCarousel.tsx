
import React, { useRef, useState, useEffect } from 'react';
import { Movie } from '../types.ts';
import MovieCard from './MovieCard.tsx';

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  likedMovies: Set<string>;
  onToggleLike: (movieKey: string) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies, onSelectMovie, likedMovies, onToggleLike }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Function to check scroll position and update button visibility
  const checkScrollPosition = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const atStart = el.scrollLeft === 0;
      // Add a small buffer for scrollWidth calculation inconsistencies
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setIsAtStart(atStart);
      setIsAtEnd(atEnd);
    }
  };

  // Check on mount and when movies or window size change
  useEffect(() => {
    const timer = setTimeout(() => checkScrollPosition(), 100);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [movies]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8; // Scroll by 80% of the visible width
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (movies.length === 0) {
    return (
        <div className="mb-12">
            {title && <h2 className="text-2xl font-bold mb-4 text-white hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap">{title}</h2>}
            <p className="text-gray-400">No movies found.</p>
        </div>
    );
  }

  return (
    <div 
      className="mb-12 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {title && <h2 className="text-2xl font-bold mb-4 text-white hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap">{title}</h2>}
      
      <div 
        ref={scrollContainerRef}
        onScroll={checkScrollPosition}
        className="flex overflow-x-auto space-x-4 pb-4 -mx-4 px-4 scrollbar-hide touch-pan-x overscroll-y-contain"
      >
        {movies.map((movie) => (
          <MovieCard
            key={movie.key}
            movie={movie}
            onSelectMovie={onSelectMovie}
            isLiked={likedMovies.has(movie.key)}
            onToggleLike={onToggleLike}
          />
        ))}
      </div>

      {/* Navigation Buttons - Hidden on mobile, appear on desktop hover */}
      {!isAtStart && (
        <button 
          onClick={() => handleScroll('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full transition-opacity duration-300 hidden md:block ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {!isAtEnd && (
        <button 
          onClick={() => handleScroll('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full transition-opacity duration-300 hidden md:block ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Scroll right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  );
};

export default MovieCarousel;
