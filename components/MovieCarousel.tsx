
import React from 'react';
import { Movie } from '../types';
import MovieCard from './MovieCard';

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  likedMovies: Set<string>;
  onToggleLike: (movieKey: string) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies, onSelectMovie, likedMovies, onToggleLike }) => {
  if (movies.length === 0) {
    return (
        <div className="mb-12">
            {title && <h2 className="text-2xl font-bold mb-4 text-white hover:text-red-500 transition-colors cursor-pointer truncate">{title}</h2>}
            <p className="text-gray-400">No movies found.</p>
        </div>
    );
  }

  return (
    <div className="mb-12">
      {title && <h2 className="text-2xl font-bold mb-4 text-white hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap truncate">{title}</h2>}
      <div className="flex overflow-x-auto space-x-4 pb-4 -mx-4 px-4 scrollbar-hide">
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
    </div>
  );
};

export default MovieCarousel;