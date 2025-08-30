import React from 'react';
import { Movie } from '../types.ts';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
  return (
    <div
      className="w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-black transition-transform duration-300 ease-in-out hover:scale-105"
      onClick={() => onSelectMovie(movie)}
    >
        <img 
          src={movie.poster} 
          alt={movie.title} 
          className="w-full h-full object-cover" 
          loading="lazy" 
        />
    </div>
  );
};

export default MovieCard;