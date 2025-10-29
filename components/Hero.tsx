import React from 'react';
import { Movie } from '../types';

interface HeroProps {
    movie: Movie | null;
    onSelectMovie: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = () => {
  return <div>Hero Component</div>;
};

export default Hero;
