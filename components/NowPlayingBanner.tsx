import React from 'react';
import { Movie } from '../types';

interface NowPlayingBannerProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const NowPlayingBanner: React.FC<NowPlayingBannerProps> = ({ movie, onSelectMovie }) => {
  return (
    <div
      className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden cursor-pointer group mb-8 md:mb-12"
      onClick={() => onSelectMovie(movie)}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      {/* Background Image */}
      <img
        src={movie.poster}
        alt="" // Decorative
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-6 md:p-12 text-white max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400 mb-2">Now Streaming</p>
        <h2 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">{movie.title}</h2>
        <p className="text-sm md:text-base text-gray-300 line-clamp-3" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
      </div>
    </div>
  );
};

export default NowPlayingBanner;
