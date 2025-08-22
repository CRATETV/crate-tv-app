
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

  // Truncate synopsis and clean up HTML tags for the preview
  const truncatedSynopsis = movie.synopsis.replace(/<br\s*\/?>/gi, ' ').substring(0, 120);
  const mainCast = movie.cast.slice(0, 3).map(actor => actor.name).join(', ');

  return (
    <div
      className="group relative flex-shrink-0 w-40 h-64 sm:w-48 sm:h-72 md:w-56 md:h-80 rounded-lg overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-red-500/30"
      onClick={() => onSelectMovie(movie)}
    >
      {/* Poster Image */}
      <img 
        src={movie.poster} 
        alt={movie.title} 
        className="w-full h-full object-cover transition-all duration-300" 
        loading="lazy" 
      />
      
      {/* Hover Overlay with Full Details */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end transition-opacity duration-300 opacity-0 group-hover:opacity-100">
        
        <div className="text-white overflow-hidden">
          <h3 className="text-lg font-bold text-white drop-shadow-md mb-2 truncate">{movie.title}</h3>
          <p className="text-sm text-gray-200 line-clamp-4 mb-3">
            {truncatedSynopsis}{truncatedSynopsis.length === 120 && '...'}
          </p>
          {mainCast && (
            <p className="text-xs text-gray-300 truncate">
              <span className="font-semibold">Starring:</span> {mainCast}
            </p>
          )}
        </div>
        
        {/* Like Button and Count at the bottom */}
        <div className="flex justify-between items-center mt-4">
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
