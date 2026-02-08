
import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';
import LaurelPreview from './LaurelPreview';

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
  theme?: 'christmas' | 'valentines' | 'gold' | 'generic';
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelectMovie, isWatched, isOnWatchlist, isLiked, onToggleLike, onToggleWatchlist, onSupportMovie, theme }) => {
  if (!movie) return null;
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const now = new Date();
  
  const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
  const isActuallyComingSoon = releaseDate && releaseDate > now;

  const isLeavingSoon = React.useMemo(() => {
    if (!movie.publishedAt) return false;
    const published = new Date(movie.publishedAt);
    const expiry = new Date(published);
    expiry.setFullYear(expiry.getFullYear() + 1);
    
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const timeToExpiry = expiry.getTime() - now.getTime();
    return timeToExpiry < thirtyDaysInMs && timeToExpiry > 0;
  }, [movie.publishedAt]);

  const isNew = React.useMemo(() => {
    if (!movie.releaseDateTime) return false;
    const release = new Date(movie.releaseDateTime);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return release > fourteenDaysAgo && release <= now;
  }, [movie.releaseDateTime]);

  const willBeFreeSoon = React.useMemo(() => {
      if (!movie.autoReleaseDate) return false;
      const release = new Date(movie.autoReleaseDate);
      return release > now && (movie.isForSale || movie.isWatchPartyPaid);
  }, [movie.autoReleaseDate, movie.isForSale, movie.isWatchPartyPaid]);

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
    if (isActuallyComingSoon && !movie.trailer) return;
    
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (previewLimitTimeoutRef.current) clearTimeout(previewLimitTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
      setIsMuted(true);
      previewLimitTimeoutRef.current = setTimeout(() => {
        stopPreview();
      }, 45000);
    }, 600);
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
    if (video.duration > 0 && !isActuallyComingSoon) {
        video.currentTime = Math.min(60, video.duration * 0.3);
    }
  };

  useEffect(() => {
    return () => { 
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); 
        if (previewLimitTimeoutRef.current) clearTimeout(previewLimitTimeoutRef.current);
    };
  }, []);

  const videoSrc = movie.trailer || (!isActuallyComingSoon ? movie.fullMovie : '');

  const cleanSynopsis = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <div
      className={`group relative cursor-pointer aspect-[3/4] rounded-lg bg-gray-900 transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${showPreview ? 'scale-125 z-50 shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/20' : 'hover:scale-105 hover:z-30 border border-white/5'}`}
      onClick={() => onSelectMovie(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ATMOSPHERE LAYER (Hearts/Trees) */}
      {!showPreview && theme === 'valentines' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
              <div className="absolute -left-4 top-1/4 text-2xl animate-heart-beat">❤️</div>
              <div className="absolute -right-4 top-2/3 text-xl animate-heart-beat [animation-delay:1s]">💖</div>
          </div>
      )}
      {!showPreview && theme === 'christmas' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
              <div className="absolute -left-6 bottom-4 text-3xl animate-tree-sway">🎄</div>
              <div className="absolute -right-6 top-4 text-2xl animate-tree-sway [animation-delay:1.5s]">🎄</div>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity animate-twinkle pointer-events-none"></div>
          </div>
      )}

      <div className="relative w-full h-full overflow-hidden rounded-lg">
          {!isImageLoaded && <div className="absolute inset-0 shimmer-bg"></div>}
          
          <img
            src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
            alt={movie.title}
            className={`w-full h-full object-cover transition-opacity duration-700 ${isImageLoaded ? 'opacity-100' : 'opacity-0'} ${showPreview ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            crossOrigin="anonymous"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {isActuallyComingSoon && (
                  <span className="bg-blue-600 text-[8px] font-black px-2 py-1 rounded shadow-lg text-white uppercase tracking-widest">Coming Soon</span>
              )}
              {willBeFreeSoon && !isActuallyComingSoon && (
                  <span className="bg-indigo-600 text-[8px] font-black px-2 py-1 rounded shadow-lg text-white uppercase tracking-widest">To Catalog</span>
              )}
              {isLeavingSoon && !isActuallyComingSoon && (
                  <span className="bg-amber-600 text-[8px] font-black px-2 py-1 rounded shadow-lg text-white uppercase tracking-widest">Leaving Soon</span>
              )}
              {isNew && !isActuallyComingSoon && (
                    <span className="text-[8px] font-black bg-red-600 text-white px-2 py-1 rounded tracking-widest shadow-lg uppercase">NEW</span>
              )}
          </div>

          {/* Award Overlay */}
          {!showPreview && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[85%] pointer-events-none group-hover:opacity-0 transition-all duration-300">
                  {movie.customLaurelUrl ? (
                      <img src={movie.customLaurelUrl} alt="Award" className="w-full h-auto drop-shadow-2xl" />
                  ) : (movie.awardName && movie.awardYear) ? (
                      <LaurelPreview 
                          awardName={movie.awardName} 
                          year={movie.awardYear} 
                          color="#FFFFFF" 
                      />
                  ) : null}
              </div>
          )}
          
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
                
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white z-[60] hover:bg-red-600 transition-colors shadow-2xl"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                    )}
                </button>
            </div>
          )}
          
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end transition-all duration-500 ease-out ${showPreview ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
             <div className="backdrop-blur-sm bg-black/40 rounded-lg -mx-1 px-2 py-1.5 border border-white/5">
                <h4 className="text-white font-black text-[10px] mb-1 uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {movie.title}
                </h4>
                <p className="text-gray-200 text-[8px] line-clamp-3 mb-2 leading-snug font-medium drop-shadow-md">
                    {cleanSynopsis(movie.synopsis)}
                </p>
             </div>
             
             <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                    <button onClick={handleToggleWatchlist} className="p-1.5 rounded-full bg-white/10 hover:bg-white/30 border border-white/10 transition-all shadow-lg">
                        {isOnWatchlist ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        )}
                    </button>
                    <button onClick={handleToggleLike} className={`p-1.5 rounded-full bg-white/10 hover:bg-red-600/40 border border-white/10 transition-all shadow-lg ${isAnimatingLike ? 'animate-heartbeat' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>
                {isWatched && (
                    <span className="text-[7px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded tracking-tighter">WATCHED</span>
                )}
             </div>
          </div>
      </div>
    </div>
  );
};
