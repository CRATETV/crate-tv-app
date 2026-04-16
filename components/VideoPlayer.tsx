/**
 * VideoPlayer.tsx — Crate Professional Video Player
 *
 * Netflix-inspired behavior:
 * - All controls (including Cast) auto-hide after 3s of inactivity
 * - Controls re-appear on any mouse movement or touch
 * - Controls always visible when paused or buffering
 * - Buffering spinner shown when video is stalled/waiting
 * - Progress bar shows buffered range (like YouTube's grey bar)
 * - Keyboard shortcuts: Space (play/pause), ← → (seek 10s), F (fullscreen), M (mute)
 * - Double-tap sides to seek on mobile
 * - Cast button is part of the controls overlay — never floats independently
 */

import React, {
  useRef, useState, useEffect, useCallback, useMemo
} from 'react';

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  onPause?: () => void;
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  /** Called with the video element once it's mounted — lets parent hold a ref */
  onVideoReady?: (el: HTMLVideoElement) => void;
  /** Overlay content rendered on top (e.g. PauseOverlay, EndScreen) */
  children?: React.ReactNode;
  className?: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

// ─── VolumeIcon ─────────────────────────────────────────────────────────────

const VolumeIcon: React.FC<{ level: number; muted: boolean }> = ({ level, muted }) => {
  if (muted || level === 0) return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
  if (level < 0.5) return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 5l-4 4H5v6h3l4 4V5z" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" />
    </svg>
  );
};

// ─── CastIcon ───────────────────────────────────────────────────────────────

const CastIcon: React.FC<{ connected: boolean }> = ({ connected }) => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d={connected
      ? "M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5c-1.1 0-2 .9-2 2v3h2v-3h14v10h-5v2h5c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM1 10v2c4.97 0 9 4.03 9 9h2C12 15.03 7 10 1 10z"
      : "M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2C12 15.03 7 10 1 10zm20-7H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H3V5h18v3h2V5c0-1.1-.9-2-2-2z"
    } />
  </svg>
);

// ─── VideoPlayer ─────────────────────────────────────────────────────────────

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  autoPlay = false,
  onPause,
  onPlay,
  onEnded,
  onError,
  onVideoReady,
  children,
  className = '',
}) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const progressRef   = useRef<HTMLDivElement>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [volume,       setVolume]       = useState(1);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);   // fraction 0-1
  const [isBuffering,  setIsBuffering]  = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekPreview,  setSeekPreview]  = useState<{ pct: number; time: number } | null>(null);

  // Cast / Remote Playback API
  const [castAvailable,   setCastAvailable]   = useState(false);
  const [castState,       setCastState]       = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // ── expose video element to parent ──────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) onVideoReady?.(videoRef.current);
  }, [onVideoReady]);

  // ── Remote Playback / Cast API ───────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('remote' in video)) return;
    const remote = (video as any).remote;

    remote.watchAvailability((available: boolean) => setCastAvailable(available))
      .catch(() => setCastAvailable(false));

    const onState = () => setCastState(remote.state);
    remote.addEventListener('connect',    onState);
    remote.addEventListener('connecting', onState);
    remote.addEventListener('disconnect', onState);
    return () => {
      remote.removeEventListener('connect',    onState);
      remote.removeEventListener('connecting', onState);
      remote.removeEventListener('disconnect', onState);
    };
  }, [src]);

  const handleCast = () => {
    const video = videoRef.current;
    if (!video || !('remote' in video)) return;
    (video as any).remote.prompt().catch((err: Error) => {
      if (err.name !== 'AbortError') console.error('Cast error:', err);
    });
  };

  // ── Activity / controls visibility ──────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // Only hide if video is actually playing
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  // Initial hide timer when autoPlay
  useEffect(() => {
    if (autoPlay) scheduleHide();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [autoPlay, scheduleHide]);

  // Hide cursor with controls
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = showControls ? 'default' : 'none';
    }
  }, [showControls]);

  // ── Fullscreen sync ─────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  }, []);

  // ── Video event handlers ─────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    // Update buffered progress
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1) / (v.duration || 1));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const handlePlay  = useCallback(() => { setIsPlaying(true);  setIsBuffering(false); onPlay?.();  scheduleHide(); }, [onPlay, scheduleHide]);
  const handlePause = useCallback(() => { setIsPlaying(false); setShowControls(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); onPause?.(); }, [onPause]);
  const handleEnded = useCallback(() => { setIsPlaying(false); setShowControls(true); onEnded?.(); }, [onEnded]);
  const handleError = useCallback(() => { setIsBuffering(false); onError?.(); }, [onError]);
  const handleWaiting = useCallback(() => setIsBuffering(true),  []);
  const handleCanPlay = useCallback(() => setIsBuffering(false), []);

  // ── Play / Pause toggle ──────────────────────────────────────────────────
  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); }
    else          { v.pause(); }
  }, []);

  // ── Volume ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted  = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  // ── Seek ─────────────────────────────────────────────────────────────────
  const seekTo = useCallback((pct: number) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    v.currentTime = pct * v.duration;
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }, [seekTo]);

  const handleProgressMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const pct  = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.getBoundingClientRect().width));
    setSeekPreview({ pct, time: pct * duration });
    if (seekPreviewTimer.current) clearTimeout(seekPreviewTimer.current);
    seekPreviewTimer.current = setTimeout(() => setSeekPreview(null), 2000);
  }, [duration]);

  const handleProgressLeave = useCallback(() => setSeekPreview(null), []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (v.paused) v.play().catch(() => {}); else v.pause();
          revealControls();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          revealControls();
          break;
        case 'ArrowRight':
          e.preventDefault();
          v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
          revealControls();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowUp':
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          revealControls();
          break;
        case 'ArrowDown':
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          revealControls();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealControls, toggleFullscreen, toggleMute]);

  // ── Progress percentage ───────────────────────────────────────────────────
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = buffered * 100;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black select-none ${className}`}
      onMouseMove={revealControls}
      onMouseLeave={() => { if (isPlaying) scheduleHide(); }}
      onTouchStart={revealControls}
    >
      {/* ── Blurred ambient backdrop ──────────────────────────────────── */}
      <video
        src={src}
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30 pointer-events-none"
        muted playsInline aria-hidden="true"
        preload="none"
      />

      {/* ── Main video ────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        autoPlay={autoPlay}
        controlsList="nodownload"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onStalled={handleWaiting}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onContextMenu={e => e.preventDefault()}
      />

      {/* ── Buffering spinner ─────────────────────────────────────────── */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* ── Child overlays (PauseOverlay, EndScreen etc.) ─────────────── */}
      {children}

      {/* ── Controls overlay ─────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col justify-end z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Top bar — cast + future controls */}
        <div className="relative flex justify-end items-center px-4 pt-4 pb-2 gap-3">
          {castAvailable && (
            <button
              onClick={handleCast}
              title="Cast to device"
              className={`p-2 rounded-full bg-black/40 hover:bg-black/70 transition-colors backdrop-blur-sm border border-white/10 ${castState === 'connected' ? 'text-red-400' : 'text-white'} ${castState === 'connecting' ? 'animate-pulse' : ''}`}
            >
              <CastIcon connected={castState === 'connected'} />
            </button>
          )}
        </div>

        {/* Bottom controls */}
        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2 transition-all duration-150"
            onClick={handleProgressClick}
            onMouseMove={handleProgressMove}
            onMouseLeave={handleProgressLeave}
          >
            {/* Buffered */}
            <div
              className="absolute left-0 top-0 h-full bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Played */}
            <div
              className="absolute left-0 top-0 h-full bg-red-500 rounded-full pointer-events-none"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
            {/* Seek preview tooltip */}
            {seekPreview && (
              <div
                className="absolute -top-8 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none"
                style={{ left: `calc(${seekPreview.pct * 100}% - 20px)` }}
              >
                {fmtTime(seekPreview.time)}
              </div>
            )}
          </div>

          {/* Button row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip back 10s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Rewind 10s (←)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="7" y="16" fontSize="6" fontWeight="900" fill="currentColor">10</text>
              </svg>
            </button>

            {/* Skip forward 10s */}
            <button
              onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Forward 10s (→)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="7" y="16" fontSize="6" fontWeight="900" fill="currentColor">10</text>
              </svg>
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white" title="Mute (M)">
                <VolumeIcon level={volume} muted={isMuted} />
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-red-500 cursor-pointer"
                  style={{ background: `linear-gradient(to right, #ef4444 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)` }}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-xs font-mono ml-1 select-none">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for skip button SVG text alignment */}
      <style>{`
        .video-skip-btn text { dominant-baseline: central; text-anchor: middle; }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
