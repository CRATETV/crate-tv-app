
import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  isWatched?: boolean;
  isOnWatchlist?: boolean;
  isLiked?: boolean;
  onToggleLike?: (movieKey: string) => void;
  onToggleWatchlist?: (movieKey: string) => void;
  onSupportMovie?: (movie: Movie) => void;
  isComingSoon?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, isWatched, isOnWatchlist, isLiked, onToggleLike, onToggleWatchlist, onSupportMovie, isComingSoon }) => {
  if (!movie) return null;
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isNew = React.useMemo(() => {
    if (!movie.releaseDateTime) return false;
    const release = new Date(movie.releaseDateTime);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return release > fourteenDaysAgo && release <= new Date();
  }, [movie.releaseDateTime]);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimatingLike(true);
    setTimeout(() => setIsAnimatingLike(false), 500);
    onToggleLike?.(movie.key);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchlist?.(movie.key);
  };

  const stopPreview = () => {
    setShowPreview(false);
    setIsMuted(true);
    if (previewLimitTimeoutRef.current) {
        clearTimeout(previewLimitTimeoutRef.current);
        previewLimitTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (isComingSoon || (!movie.trailer && !movie.fullMovie)) return;
    
    // Clear any previous state
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (previewLimitTimeoutRef.current) clearTimeout(previewLimitTimeoutRef.current);

    // Netflix-style 500ms delay before starting video
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
      setIsMuted(true);
      
      // Stop preview after exactly 60 seconds to save bandwidth and return to static poster
      previewLimitTimeoutRef.current = setTimeout(() => {
        stopPreview();
      }, 60000);

    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
    }
    stopPreview();
  };

  const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (video.duration > 0) {
        // Start from 30% into the video for a more engaging preview
        video.currentTime = Math.min(60, video.duration * 0.3);
    }
  };

  useEffect(() => {
    return () => { 
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); 
        if (previewLimitTimeoutRef.current) clearTimeout(previewLimitTimeoutRef.current);
    };
  }, []);

  const videoSrc = movie.trailer || movie.fullMovie;

  return (
    <div
      className="group relative cursor-pointer aspect-[3/4] rounded-md overflow-hidden bg-gray-900 transition-all duration-400 ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-110 hover:z-30 border border-white/5 hover:shadow-2xl"
      onClick={() => onSelectMovie(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isImageLoaded && <div className="absolute inset-0 shimmer-bg"></div>}
      
      <img
        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
        alt={movie.title}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'} ${showPreview ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
        loading="lazy"
        onLoad={() => setIsImageLoaded(true)}
        crossOrigin="anonymous"
      />
      
      {showPreview && videoSrc && (
        <div className="absolute inset-0 bg-black animate-[fadeIn_0.4s_ease-out]">
            <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                onLoadedMetadata={handleMetadataLoaded}
                className="w-full h-full object-cover"
            />
            {/* Unmute Indicator/Toggle */}
            <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-16 right-3 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white z-20"
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                )}
            </button>
        </div>
      )}
      
      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 transition-opacity group-hover:opacity-0">
          {isNew && <div className="bg-red-600 text-white text-[10px] font-black tracking-tighter px-1.5 py-0.5 rounded uppercase">New</div>}
          {isComingSoon && <div className="bg-purple-600/90 text-white text-[10px] font-black tracking-tighter px-1.5 py-0.5 rounded uppercase">Soon</div>}
      </div>

      {/* Metadata Reveal Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/100 via-black/40 to-transparent p-4 flex flex-col justify-end transition-all duration-300 ${showPreview ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
         <h4 className="text-white font-black text-sm mb-1 truncate drop-shadow-md">{movie.title}</h4>
         <p className="text-gray-300 text-[10px] line-clamp-2 mb-3 leading-tight font-medium" dangerouslySetInnerHTML={{ __html: movie.synopsis || '' }}></p>
         
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={handleToggleWatchlist} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors">
                    {isOnWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    )}
                </button>
                <button onClick={handleToggleLike} className={`p-1.5 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 transition-all ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};
