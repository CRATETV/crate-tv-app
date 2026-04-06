import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

export const MovieCard: React.FC<MovieCardProps> = ({
  movie, onSelectMovie, isWatched, isOnWatchlist, isLiked,
  onToggleLike, onToggleWatchlist, onSupportMovie, theme,
}) => {
  if (!movie) return null;

  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isImageLoaded, setIsImageLoaded]     = useState(false);
  const [showExpanded, setShowExpanded]       = useState(false);
  const [isMuted, setIsMuted]                 = useState(true);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [sheetMuted, setSheetMuted]           = useState(true);
  const hoverTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef        = useRef<HTMLVideoElement>(null);
  const sheetVideoRef   = useRef<HTMLVideoElement>(null);
  const cardRef         = useRef<HTMLDivElement>(null);

  const now = new Date();

  // Poster variant rotation (weekly)
  const currentPoster = useMemo(() => {
    if (!movie.posterVariants?.length) return movie.poster;
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return movie.posterVariants[week % movie.posterVariants.length];
  }, [movie.poster, movie.posterVariants]);

  const releaseDate       = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
  const isActuallyComingSoon = releaseDate && releaseDate > now;

  const isLeavingSoon = useMemo(() => {
    if (!movie.publishedAt) return false;
    const expiry = new Date(new Date(movie.publishedAt).setFullYear(new Date(movie.publishedAt).getFullYear() + 1));
    const ms = expiry.getTime() - now.getTime();
    return ms < 30 * 86400000 && ms > 0;
  }, [movie.publishedAt]);

  const isNew = useMemo(() => {
    if (!movie.releaseDateTime) return false;
    const release = new Date(movie.releaseDateTime);
    const ago = new Date(); ago.setDate(ago.getDate() - 14);
    return release > ago && release <= now;
  }, [movie.releaseDateTime]);

  const willBeFreeSoon = useMemo(() =>
    !!(movie.autoReleaseDate && new Date(movie.autoReleaseDate) > now && (movie.isForSale || movie.isWatchPartyPaid)),
  [movie.autoReleaseDate, movie.isForSale, movie.isWatchPartyPaid]);

  const videoSrc = !isActuallyComingSoon ? movie.fullMovie : '';

  const cleanSynopsis = (html: string) =>
    new DOMParser().parseFromString(html, 'text/html').body.textContent || '';

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
    // No hover expansion on touch/mobile devices
    if (window.matchMedia('(hover: none)').matches) return;
    if (isActuallyComingSoon && !movie.trailer) return;

    if (movie.fullMovie && !movie.fullMovie.includes('vimeo') && !movie.fullMovie.includes('youtube'))
      window.dispatchEvent(new CustomEvent('preloadVideo', { detail: movie.fullMovie }));

    hoverTimerRef.current = setTimeout(() => setShowExpanded(true), 700);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    leaveTimerRef.current = setTimeout(() => {
      setShowExpanded(false);
      setIsMuted(true);
      if (previewStopRef.current) { clearTimeout(previewStopRef.current); previewStopRef.current = null; }
    }, 200);
  };

  const handleExpandedEnter = () => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
  };

  const handleExpandedLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setShowExpanded(false);
      setIsMuted(true);
    }, 150);
  };

  const previewStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.duration > 0) {
      // Start at 30% into the film — drops into the action
      v.currentTime = Math.min(v.duration * 0.3, v.duration - 65);
      // Stop after 60 seconds
      if (previewStopRef.current) clearTimeout(previewStopRef.current);
      previewStopRef.current = setTimeout(() => {
        v.pause();
      }, 60000);
    }
  };

  useEffect(() => () => {
    if (hoverTimerRef.current)   clearTimeout(hoverTimerRef.current);
    if (leaveTimerRef.current)   clearTimeout(leaveTimerRef.current);
    if (previewStopRef.current)  clearTimeout(previewStopRef.current);
  }, []);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (showMobileSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileSheet]);

  const genres = Array.isArray(movie.genres)
    ? movie.genres.slice(0, 3).join(' · ')
    : (movie.genres || '');

  const isMobile = () => window.matchMedia('(hover: none)').matches;

  return (
    <>
    <div
      ref={cardRef}
      className="group relative cursor-pointer aspect-[3/4] rounded-lg bg-gray-900 border border-white/5 transition-all duration-300 hover:z-40"
      style={{ isolation: 'isolate' }}
      onClick={() => isMobile() ? setShowMobileSheet(true) : onSelectMovie(movie)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── SEASONAL ORNAMENTS ─────────────────────────────────── */}
      {!showExpanded && theme === 'valentines' && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          <div className="absolute -left-9 top-1/4 text-4xl animate-heart-beat drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">❤️</div>
          <div className="absolute -right-9 top-2/3 text-3xl animate-heart-beat drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" style={{ animationDelay: '1s' }}>💖</div>
        </div>
      )}
      {!showExpanded && theme === 'christmas' && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          <div className="absolute -left-10 bottom-2 text-5xl animate-tree-sway drop-shadow-2xl">🎄</div>
          <div className="absolute -right-10 top-2 text-4xl animate-tree-sway drop-shadow-2xl" style={{ animationDelay: '1.5s' }}>🎄</div>
        </div>
      )}

      {/* ── POSTER ─────────────────────────────────────────────── */}
      <div className={`relative w-full h-full overflow-hidden rounded-lg transition-all duration-300 ${showExpanded ? 'brightness-50' : ''}`}>
        {!isImageLoaded && <div className="absolute inset-0 shimmer-bg" />}
        <img
          src={`/api/proxy-image?url=${encodeURIComponent(currentPoster)}`}
          alt={movie.title}
          className={`w-full h-full object-cover transition-opacity duration-700 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
          crossOrigin="anonymous"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {isActuallyComingSoon   && <span className="bg-blue-600   text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">Coming Soon</span>}
          {willBeFreeSoon && !isActuallyComingSoon && <span className="bg-indigo-600 text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">To Catalog</span>}
          {isLeavingSoon  && !isActuallyComingSoon && <span className="bg-amber-600  text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">Leaving Soon</span>}
          {isNew          && !isActuallyComingSoon && <span className="bg-red-600    text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">NEW</span>}
          {(movie.isForSale || movie.isWatchPartyPaid) && <span className="bg-amber-700 text-[8px] font-black px-2 py-1 rounded text-white uppercase tracking-widest">PREMIER</span>}
        </div>

        {/* Laurel */}
        {!showExpanded && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[85%] pointer-events-none group-hover:opacity-0 transition-all duration-300">
            {movie.customLaurelUrl ? (
              <img src={movie.customLaurelUrl} alt="Award" className="w-full h-auto drop-shadow-2xl" />
            ) : (movie.awardName && movie.awardYear) ? (
              <LaurelPreview awardName={movie.awardName} year={movie.awardYear} color="#FFFFFF" />
            ) : null}
          </div>
        )}
      </div>

      {/* ── NETFLIX-STYLE EXPANDED CARD ─────────────────────────── */}
      {showExpanded && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 w-[320px] md:w-[380px] rounded-xl overflow-hidden bg-[#141414] shadow-[0_30px_80px_rgba(0,0,0,0.95)] border border-white/10"
          style={{
            top: '-8px',
            animation: 'expandCard 0.22s cubic-bezier(0.33,1,0.68,1) forwards',
          }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={handleExpandedEnter}
          onMouseLeave={handleExpandedLeave}
        >
          {/* Video / hero section — 16:9 */}
          <div className="relative w-full aspect-video bg-black overflow-hidden">
            {videoSrc ? (
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
            ) : (
              <img
                src={`/api/proxy-image?url=${encodeURIComponent(currentPoster)}`}
                alt={movie.title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            )}

            {/* Gradient over video */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />

            {/* Mute toggle */}
            {videoSrc && (
              <button
                onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full border border-white/20 text-white hover:bg-red-600 transition-colors z-10"
              >
                {isMuted ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                )}
              </button>
            )}
          </div>

          {/* Info panel */}
          <div className="px-4 pt-3 pb-4">

            {/* Title + badges row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-white font-black text-sm uppercase tracking-tight leading-tight">{movie.title}</h3>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {isNew && <span className="text-[7px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded tracking-widest">NEW</span>}
                {isWatched && <span className="text-[7px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded tracking-tighter">WATCHED</span>}
              </div>
            </div>

            {/* Meta — year · runtime · genre */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {movie.releaseDateTime && (
                <span className="text-gray-400 text-[10px]">{new Date(movie.releaseDateTime).getFullYear()}</span>
              )}
              {!!movie.durationInMinutes && (
                <>
                  <span className="text-gray-600 text-[9px]">·</span>
                  <span className="text-gray-400 text-[10px]">{movie.durationInMinutes}m</span>
                </>
              )}
              {genres && (
                <>
                  <span className="text-gray-600 text-[9px]">·</span>
                  <span className="text-[#E50914] text-[10px] font-medium">{genres}</span>
                </>
              )}
              {(movie.isForSale || movie.isWatchPartyPaid) && (
                <span className="bg-amber-700/80 text-[7px] font-black text-white px-1.5 py-0.5 rounded tracking-widest ml-1">$4.99</span>
              )}
            </div>

            {/* Synopsis */}
            {movie.synopsis && (
              <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2 mb-3">
                {cleanSynopsis(movie.synopsis)}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Play */}
              <button
                onClick={e => { e.stopPropagation(); onSelectMovie(movie); }}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-200 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg transition-colors flex-1 justify-center"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play
              </button>

              {/* Watchlist */}
              <button
                onClick={e => { e.stopPropagation(); onToggleWatchlist?.(movie.key); }}
                className="p-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition-all"
                title={isOnWatchlist ? 'Remove from list' : 'Add to list'}
              >
                {isOnWatchlist ? (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                )}
              </button>

              {/* Like */}
              <button
                onClick={e => { e.stopPropagation(); setIsAnimatingLike(true); setTimeout(() => setIsAnimatingLike(false), 500); onToggleLike?.(movie.key); }}
                className={`p-2 rounded-full border border-white/20 bg-white/5 hover:bg-red-600/30 transition-all ${isAnimatingLike ? 'animate-heartbeat' : ''}`}
              >
                <svg className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              {/* More info */}
              <button
                onClick={e => { e.stopPropagation(); onSelectMovie(movie); }}
                className="p-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition-all ml-auto"
                title="More info"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animation keyframe injected once */}
      <style>{`
        @keyframes expandCard {
          from { opacity: 0; transform: translateX(-50%) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>

    {/* ── MOBILE BOTTOM SHEET ─────────────────────────────────── */}
    {showMobileSheet && createPortal(
      <div
        className="fixed inset-0 z-[999] flex items-end"
        onClick={() => setShowMobileSheet(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Sheet */}
        <div
          className="relative w-full bg-[#141414] rounded-t-2xl overflow-hidden max-h-[92dvh] flex flex-col"
          style={{ animation: 'slideUp 0.32s cubic-bezier(0.32,0.72,0,1) forwards' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/25" />
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain">
            {/* Video / poster hero */}
            <div className="relative w-full aspect-video bg-black">
              {videoSrc ? (
                <video
                  ref={sheetVideoRef}
                  src={videoSrc}
                  autoPlay
                  muted={sheetMuted}
                  playsInline
                  onLoadedMetadata={e => {
                    const v = e.currentTarget;
                    if (v.duration > 0) v.currentTime = Math.min(v.duration * 0.3, v.duration - 65);
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(currentPoster)}`}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              )}

              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setShowMobileSheet(false)}
                className="absolute top-3 right-3 p-2 bg-black/60 rounded-full border border-white/20 text-white z-10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Mute toggle */}
              {videoSrc && (
                <button
                  onClick={e => { e.stopPropagation(); setSheetMuted(m => !m); }}
                  className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-full border border-white/20 text-white z-10"
                >
                  {sheetMuted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                  )}
                </button>
              )}
            </div>

            {/* Info */}
            <div className="px-5 pt-4 pb-6">

              {/* Title + badges */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-white font-black text-lg uppercase tracking-tight leading-tight flex-1">{movie.title}</h2>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
                  {isNew     && <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded tracking-widest">NEW</span>}
                  {isWatched && <span className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded tracking-tighter">WATCHED</span>}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {movie.releaseDateTime && (
                  <span className="text-gray-400 text-xs">{new Date(movie.releaseDateTime).getFullYear()}</span>
                )}
                {!!movie.durationInMinutes && (
                  <>
                    <span className="text-gray-600 text-[10px]">·</span>
                    <span className="text-gray-400 text-xs">{movie.durationInMinutes}m</span>
                  </>
                )}
                {genres && (
                  <>
                    <span className="text-gray-600 text-[10px]">·</span>
                    <span className="text-[#E50914] text-xs font-medium">{genres}</span>
                  </>
                )}
                {(movie.isForSale || movie.isWatchPartyPaid) && (
                  <span className="bg-amber-700/80 text-[8px] font-black text-white px-2 py-0.5 rounded tracking-widest ml-1">$4.99</span>
                )}
              </div>

              {/* Synopsis */}
              {movie.synopsis && (
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  {cleanSynopsis(movie.synopsis)}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {/* Play — full width primary */}
                <button
                  onClick={() => { setShowMobileSheet(false); onSelectMovie(movie); }}
                  className="flex items-center justify-center gap-2 bg-white active:bg-gray-200 text-black font-black text-sm uppercase tracking-widest px-6 py-3 rounded-xl transition-colors flex-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Play
                </button>

                {/* Watchlist */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWatchlist?.(movie.key); }}
                  className="p-3 rounded-full border border-white/20 bg-white/5 active:bg-white/15 transition-all"
                >
                  {isOnWatchlist ? (
                    <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  )}
                </button>

                {/* Like */}
                <button
                  onClick={e => { e.stopPropagation(); setIsAnimatingLike(true); setTimeout(() => setIsAnimatingLike(false), 500); onToggleLike?.(movie.key); }}
                  className={`p-3 rounded-full border border-white/20 bg-white/5 active:bg-red-600/30 transition-all ${isAnimatingLike ? 'animate-heartbeat' : ''}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
