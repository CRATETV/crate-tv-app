
import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '../types';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onPlayMovie: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onPlayMovie, onMoreInfo }) => {
  const [showVideo, setShowVideo] = useState(false);
  const videoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  if (!movies || movies.length === 0) {
    return <div className="w-full h-[56.25vw] bg-gray-900 animate-pulse"></div>;
  }

  const currentMovie = movies[currentIndex];

  // Logic to handle the transition from Poster to Video loop
  useEffect(() => {
    // Reset video state when the movie changes
    setShowVideo(false);
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);

    // Only attempt to show video if the movie has a trailer
    if (currentMovie.trailer) {
      videoTimeoutRef.current = setTimeout(() => {
        setShowVideo(true);
      }, 3000); // 3-second delay before "Billboard" video starts
    }

    return () => {
      if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
    };
  }, [currentIndex, currentMovie.trailer]);

  return (
    <div className="relative w-full h-[56.25vw] max-h-[85vh] bg-black overflow-hidden">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Poster Image with Ken Burns */}
        <img
          key={`poster-${currentMovie.key}`}
          src={`/api/proxy-image?url=${encodeURIComponent(currentMovie.poster)}`}
          alt="" 
          className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out animate-ken-burns scale-110 ${showVideo ? 'opacity-0' : 'opacity-100'}`}
          onContextMenu={(e) => e.preventDefault()}
          crossOrigin="anonymous"
        />

        {/* Billboard Video Loop */}
        {currentMovie.trailer && (
            <video
                key={`video-${currentMovie.key}`}
                src={currentMovie.trailer}
                autoPlay
                muted
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${showVideo ? 'opacity-100' : 'opacity-0'}`}
                onContextMenu={(e) => e.preventDefault()}
            />
        )}

        {/* Layered Gradient for Depth & Legibility */}
        <div className="absolute inset-0 hero-gradient-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent"></div>
        {/* Bottom anchor shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 pt-20 pb-16 md:pb-24 text-white pointer-events-none">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 max-w-2xl animate-[fadeInHeroContent_0.8s_ease-out] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          {currentMovie.title}
        </h1>
        <p className="text-sm md:text-lg lg:text-xl max-w-xl mb-8 animate-[fadeInHeroContent_1s_ease-out] line-clamp-3 text-gray-100 leading-relaxed font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {currentMovie.synopsis.replace(/<[^>]+>/g, '')}
        </p>
        <div className="flex items-center gap-4 animate-[fadeInHeroContent_1.2s_ease-out] pointer-events-auto">
          <button
            onClick={() => onPlayMovie(currentMovie)}
            className="flex items-center justify-center px-8 py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-all transform hover:scale-105 shadow-2xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
          <button
            onClick={() => onMoreInfo(currentMovie)}
            className="flex items-center justify-center px-8 py-3 bg-gray-500/40 backdrop-blur-md border border-white/20 text-white font-bold rounded-md hover:bg-gray-500/60 transition-all transform hover:scale-105 shadow-2xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            More Info
          </button>
        </div>
      </div>

      {/* Navigation Indicators */}
      <div className="absolute bottom-12 left-12 z-20 hidden md:flex gap-3">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => onSetCurrentIndex(index)}
            className={`h-1.5 transition-all duration-300 rounded-full ${currentIndex === index ? 'w-10 bg-red-600' : 'w-4 bg-white/20 hover:bg-white/40'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;
