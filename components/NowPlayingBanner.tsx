import React, { useState } from 'react';
import { Movie } from '../types';

interface NowPlayingBannerProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

const NowPlayingBanner: React.FC<NowPlayingBannerProps> = ({ movie, onSelectMovie, onPlayMovie }) => {
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
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt="" // Decorative
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin="anonymous"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-6 md:p-12 text-white max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400 mb-2">Now Streaming</p>
        <h2 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">{movie.title}</h2>
        <div className="text-sm md:text-base text-gray-300 mb-6">
            <p className={!isExpanded && synopsisIsLong ? 'line-clamp-3' : ''} dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            {synopsisIsLong && !isExpanded && (
                <button onClick={handleReadMore} className="text-red-400 hover:underline font-bold mt-1 text-left">
                    Read More
                </button>
            )}
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={(e) => { e.stopPropagation(); onPlayMovie(movie); }}
                className="flex items-center justify-center px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-300 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Play
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onSelectMovie(movie); }}
                className="flex items-center justify-center px-6 py-2 bg-gray-500/70 backdrop-blur-sm text-white font-bold rounded-md hover:bg-gray-500/90 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                More Info
            </button>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingBanner;