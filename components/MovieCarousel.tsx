
import React from 'react';
import { Movie } from '../types.ts';

interface MovieCarouselProps {
    title: React.ReactNode;
    movies: Movie[];
    onSelectMovie: (movie: Movie) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, movies }) => {
  return <div><h2>{title}</h2>{/* Movie list would be here */}</div>;
};

export default MovieCarousel;
