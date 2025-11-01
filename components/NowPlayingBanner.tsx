import React, { useState } from 'react';
import { Movie } from '../types';

interface NowPlayingBannerProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

const NowPlayingBanner: React.FC<NowPlayingBannerProps> = ({ movie, onSelectMovie }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if synopsis is long by stripping HTML tags and checking length.
  const synopsisIsLong = movie.synopsis && movie.synopsis.replace(/<[^>]+>/g, '').length > 200;

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the main div's onClick from firing and opening the modal.
    setIsExpanded(true);
  };

  return (
    <div
      className="relative w-full h-auto min-h-[16rem] md:min-h-[20rem] rounded-lg overflow-hidden cursor-pointer group mb-8 md:mb-12"
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
        <div className="text-sm md:text-base text-gray-300">
            <p className={!isExpanded && synopsisIsLong ? 'line-clamp-3' : ''} dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            {synopsisIsLong && !isExpanded && (
                <button onClick={handleReadMore} className="text-red-400 hover:underline font-bold mt-1 text-left">
                    Read More
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default NowPlayingBanner;
