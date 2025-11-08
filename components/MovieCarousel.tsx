import React, { useRef } from 'react';
import { Movie, Category } from '../types';
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
  onToggleWatchlist: (movieKey: string) => void;
  onSupportMovie: (movie: Movie) => void;
  allCategories?: Record<string, Category>;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies, onSelectMovie, showRankings = false, watchedMovies, watchlist, likedMovies, onToggleLike, onToggleWatchlist, onSupportMovie, allCategories }) => {
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
      <div className="relative group/carousel">
        <div ref={scrollRef} className={carouselClasses}>
          {movies.map((movie, index) => {
             if (showRankings) {
              const rank = index + 1;
              const rankColors = [
                '#FFD700', // Gold
                '#E50914', // Red
                '#1E90FF', // Blue
                '#32CD32', // Green
                '#F37F1B', // Orange
                '#9400D3', // DarkViolet
                '#00CED1', // DarkTurquoise
                '#FF69B4', // HotPink
                '#ADFF2F', // GreenYellow
                '#BA55D3'  // MediumOrchid
              ];
              const color = rankColors[index % rankColors.length];
      
              return (
                  <div 
                      key={movie.key} 
                      className="flex-shrink-0 w-[80vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw] cursor-pointer group ranked-card-border rounded-lg"
                      onClick={() => onSelectMovie(movie)}
                      style={{ '--rank-color': color } as React.CSSProperties}
                  >
                      <div className="relative aspect-[16/9] rounded-lg bg-black overflow-hidden">
                          <img 
                              src={movie.poster}
                              alt={movie.title}
                              className="absolute top-0 right-0 h-full w-[55%] object-contain object-center group-hover:scale-105 transition-transform duration-300"
                              onContextMenu={(e) => e.preventDefault()}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
      
                          <div className="absolute bottom-0 left-0 p-4 w-full h-full flex items-start flex-col justify-between">
                              <span 
                                  className="font-black text-8xl lg:text-9xl leading-none select-none -ml-2"
                                  style={{ color: 'transparent', WebkitTextStroke: `2px ${color}` }}
                              >
                                  {rank}
                              </span>
                              <div className="min-w-0 max-w-[45%]">
                                  <p className="text-xs sm:text-sm uppercase tracking-wider text-gray-400">Start Watching</p>
                                  <h3 className="text-base sm:text-lg font-bold text-white truncate">{movie.title}</h3>
                              </div>
                          </div>
                      </div>
                  </div>
              );
            } else {
              const containerClasses = 'flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[20vw] lg:w-[15vw]';
              return (
                <div key={movie.key} className={containerClasses}>
                  <MovieCard
                    movie={movie}
                    onSelectMovie={onSelectMovie}
                    isWatched={watchedMovies.has(movie.key)}
                    isOnWatchlist={watchlist.has(movie.key)}
                    isLiked={likedMovies.has(movie.key)}
                    onToggleLike={onToggleLike}
                    onToggleWatchlist={onToggleWatchlist}
                    onSupportMovie={onSupportMovie}
                  />
                </div>
              );
            }
          })}
        </div>
        
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20 hidden md:block"
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20 hidden md:block"
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
