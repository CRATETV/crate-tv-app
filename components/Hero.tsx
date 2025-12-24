
import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';

interface HeroProps {
  movies: Movie[];
  currentIndex: number;
  onSetCurrentIndex: (index: number) => void;
  onPlayMovie: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
  hideContent?: boolean; // Prop to hide overlay text for landing page use
}

const Hero: React.FC<HeroProps> = ({ movies, currentIndex, onSetCurrentIndex, onPlayMovie, onMoreInfo, hideContent = false }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  if (!movies || movies.length === 0) {
    return <div className="w-full h-[56.25vw] bg-gray-900 animate-pulse"></div>;
  }

  const currentMovie = movies[currentIndex];

  useEffect(() => {
    setShowVideo(false);
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);

    if (currentMovie.trailer) {
      videoTimeoutRef.current = setTimeout(() => {
        setShowVideo(true);
      }, 3000);
    }

    return () => {
      if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
    };
  }, [currentIndex, currentMovie.trailer]);

  return (
    <div className="relative w-full h-[75vh] md:h-[56.25vw] md:max-h-[95vh] min-h-[500px] md:min-h-[600px] bg-black overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Poster Image */}
        <img
          key={`poster-${currentMovie.key}`}
          src={`/api/proxy-image?url=${encodeURIComponent(currentMovie.poster)}`}
          alt="" 
          className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out animate-ken-burns scale-110 ${showVideo ? 'opacity-0' : 'opacity-100'}`}
          crossOrigin="anonymous"
        />

        {/* Laurel Award Overlay for Hero */}
        {currentMovie.awardName && currentMovie.awardYear && !showVideo && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm pointer-events-none transition-opacity duration-1000">
                <LaurelPreview 
                    awardName={currentMovie.awardName} 
                    year={currentMovie.awardYear} 
                    color="#FFFFFF" 
                />
            </div>
        )}

        {/* Video Trailer */}
        {currentMovie.trailer && (
            <video
                key={`video-${currentMovie.key}`}
                src={currentMovie.trailer}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${showVideo ? 'opacity-100' : 'opacity-0'}`}
            />
        )}

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 hero-gradient-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
      </div>

      {/* Main Content (Title/Synop/Buttons) */}
      {!hideContent && (
        <div className="relative z-10 flex flex-col justify-end md:justify-center h-full px-4 md:px-12 pb-24 md:pb-24 text-white pointer-events-none">
            <h1 className="text-3xl md:text-6xl lg:text-7xl font-black mb-3 md:mb-4 max-w-2xl animate-[fadeInHeroContent_0.8s_ease-out] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] leading-tight">
            {currentMovie.title}
            </h1>
            <p className="hidden sm:block text-sm md:text-lg lg:text-xl max-w-xl mb-8 animate-[fadeInHeroContent_1s_ease-out] line-clamp-3 text-gray-100 leading-relaxed font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {currentMovie.synopsis.replace(/<[^>]+>/g, '')}
            </p>
            
            <div className="flex flex-row flex-wrap items-center gap-2 md:gap-4 animate-[fadeInHeroContent_1.2s_ease-out] pointer-events-auto">
                <button
                    onClick={() => onPlayMovie(currentMovie)}
                    className="flex items-center justify-center h-10 md:h-12 px-6 md:px-8 bg-white text-black font-bold rounded hover:bg-gray-200 transition-all transform hover:scale-105 shadow-2xl text-sm md:text-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 mr-1.5 md:mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Play
                </button>
                <button
                    onClick={() => onMoreInfo(currentMovie)}
                    className="flex items-center justify-center h-10 md:h-12 px-6 md:px-8 bg-gray-500/40 backdrop-blur-md border border-white/20 text-white font-bold rounded hover:bg-gray-500/60 transition-all transform hover:scale-105 shadow-2xl text-sm md:text-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 mr-1.5 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Info
                </button>
                
                {showVideo && (
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-all backdrop-blur-md"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                        )}
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Indicators */}
      <div className="absolute bottom-8 left-4 md:left-12 z-20 flex gap-2 md:gap-3">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => onSetCurrentIndex(index)}
            className={`h-1 transition-all duration-300 rounded-full ${currentIndex === index ? 'w-8 md:w-10 bg-red-600' : 'w-3 md:w-4 bg-white/20 hover:bg-white/40'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;
