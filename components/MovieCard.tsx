
import React, { useState } from 'react';
import { Movie } from '../types.ts';

interface MovieCardProps {
  movie: Movie;
  isLiked: boolean;
  onSelectMovie: (movie: Movie) => void;
  onToggleLike: (movieKey: string) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, isLiked, onSelectMovie, onToggleLike }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLike(movie.key);
    if (!isLiked) { // Only animate when liking
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500); // Duration of the animation
    }
  };

  return (
    <div
      className="group relative flex-shrink-0 w-40 h-64 sm:w-48 sm:h-72 md:w-56 md:h-80 rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-red-500/30"
      onClick={() => onSelectMovie(movie)}
    >
      <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-50" loading="lazy" />
      
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
        <h3 className="text-white text-base sm:text-lg font-bold truncate">{movie.title}</h3>
        <div className="flex justify-between items-center mt-2">
            <button onClick={handleLikeClick} className="flex items-center space-x-1 text-white hover:text-red-500 transition-colors" aria-label={`Like ${movie.title}`}>
                <svg xmlns="http://www.w3.org/2000/svg" 
                    className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-white'} ${isAnimating ? 'animate-heartbeat' : ''}`}
                    fill={isLiked ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>
            <span className="text-white text-sm font-semibold">{movie.likes}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;