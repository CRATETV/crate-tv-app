import React, { useRef } from 'react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface MovieCarouselProps {
  title: React.ReactNode;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  showRankings?: boolean;
  watchedMovies: Set<string>;
  watchlist: Set<string>;
  likedMovies: Set<string>;
  onToggleLike: (movieKey: string) => void;
  onSupportMovie: (movie: Movie) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies, onSelectMovie, showRankings = false, watchedMovies, watchlist, likedMovies, onToggleLike, onSupportMovie }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8; // Scroll by 80% of the container width
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) {
    return null;
  }
  
  const carouselClasses = `flex overflow-x-auto space-x-4 pb-4 scrollbar-hide -mx-4 px-4 sm:-mx-8 sm:px-8`;

  return (
    <div className="mb-8 md:mb-12">
      {typeof title === 'string' ? (
        <h2 className="text-lg md:text-2xl font-bold mb-4 text-white">{title}</h2>
      ) : (
        title
      )}
      <div className="relative group">
        <div ref={scrollRef} className={carouselClasses}>
          {movies.map((movie, index) => {
            const containerClasses = showRankings 
                ? 'flex-shrink-0 w-[80vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw]' 
                : 'flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[20vw] lg:w-[15vw]';

            return (
              <div key={movie.key} className={containerClasses}>
                <MovieCard
                  movie={movie}
                  onSelectMovie={onSelectMovie}
                  rank={showRankings ? index + 1 : undefined}
                  isWatched={watchedMovies.has(movie.key)}
                  isOnWatchlist={watchlist.has(movie.key)}
                  isLiked={likedMovies.has(movie.key)}
                  onToggleLike={onToggleLike}
                  onSupportMovie={onSupportMovie}
                />
              </div>
            );
          })}
        </div>
        
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:block"
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:block"
          aria-label="Scroll right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MovieCarousel;
