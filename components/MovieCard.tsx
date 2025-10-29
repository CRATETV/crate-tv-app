
import React from 'react';
import { Movie } from '../types.ts';

interface MovieCardProps {
    movie: Movie;
    onSelectMovie: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie }) => {
  return <div onClick={() => onSelectMovie(movie)}>{movie.title}</div>;
};

export default MovieCard;
