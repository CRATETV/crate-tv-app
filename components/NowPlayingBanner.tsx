import React, { useState } from 'react';
import { Movie } from '../types';

interface NowStreamingBannerProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  isLive?: boolean;
}

const NowStreamingBanner: React.FC<NowStreamingBannerProps> = ({ movie, onSelectMovie, onPlayMovie, isLive = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!movie || !movie.title) return null;

  // Check if synopsis is long by stripping HTML tags and checking length.
  const synopsisIsLong = movie.synopsis && movie.synopsis.replace(/<[^>]+>/g, '').length > 200;

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsExpanded(true);
  };

  const handleBannerClick = () => {
    onSelectMovie(movie);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayMovie(movie);
  };

  return (
    <div
      className={`relative w-full h-auto min-h-[16rem] md:min-h-[20rem] rounded-3xl overflow-hidden cursor-pointer group mb-8 md:mb-12 bg-black border ${isLive ? 'border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'border-white/5 shadow-2xl'} animate-[fadeIn_0.5s_ease-out] transition-all`}
      onClick={handleBannerClick}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      {/* Background Image */}
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin="anonymous"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-8 md:p-12 text-white max-w-2xl">
        <div className="flex items-center gap-3 mb-3">
             <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-white' : 'bg-red-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-white shadow-[0_0_10px_white]' : 'bg-red-600'}`}></span>
            </span>
            <p className={`text-sm font-black uppercase tracking-[0.3em] ${isLive ? 'text-white' : 'text-red-500'}`}>
                {isLive ? 'Live Event Active' : 'Global Spotlight'}
            </p>
            {isLive && (
                <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-gray-300">
                    Host is Live
                </div>
            )}
        </div>
        <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter uppercase leading-none drop-shadow-2xl">{movie.title}</h2>
        <div className="text-sm md:text-base text-gray-300 mb-8 font-medium leading-relaxed">
            <p className={!isExpanded && synopsisIsLong ? 'line-clamp-3' : ''} dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
            {synopsisIsLong && !isExpanded && (
                <button onClick={handleReadMore} className="text-red-500 hover:text-white font-black mt-2 text-left uppercase text-xs tracking-widest transition-colors">
                    Read Treatment
                </button>
            )}
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={handlePlayClick}
                className={`flex items-center justify-center px-10 py-3 ${isLive ? 'bg-red-600 text-white' : 'bg-white text-black'} font-black rounded-xl hover:scale-105 transition-all transform active:scale-95 shadow-xl uppercase text-xs tracking-widest`}
            >
                {isLive ? (
                    <>
                        <span className="mr-2">●</span>
                        Join Live Screening
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        Watch Now
                    </>
                )}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onSelectMovie(movie); }}
                className="flex items-center justify-center px-10 py-3 bg-white/10 backdrop-blur-md text-white font-black rounded-xl border border-white/10 hover:bg-white/20 transition-all transform active:scale-95 uppercase text-xs tracking-widest"
            >
                Catalog Details
            </button>
        </div>
      </div>
    </div>
  );
};

export default NowStreamingBanner;