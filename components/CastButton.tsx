import React, { useState, useEffect, useCallback } from 'react';

interface CastButtonProps {
  videoElement: HTMLVideoElement | null;
  // Optional: pass the video URL directly for Chromecast (it fetches from src otherwise)
  videoUrl?: string;
  // Optional: movie title for Chromecast display
  title?: string;
}

// Google Cast Application ID — use the default media receiver for basic video playback
const CAST_APP_ID = 'CC1AD845'; // Default Media Receiver

const CastButton: React.FC<CastButtonProps> = ({ videoElement, videoUrl, title }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [castType, setCastType] = useState<'chromecast' | 'airplay' | 'remote' | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // AIRPLAY (Safari/iOS)
  // ══════════════════════════════════════════════════════════════════════════
  const hasNativeAirPlay = !!videoElement && typeof (videoElement as any).webkitShowPlaybackTargetPicker === 'function';

  useEffect(() => {
    if (!videoElement || !hasNativeAirPlay) return;

    const handleWirelessChange = () => {
      const isWireless = (videoElement as any).webkitCurrentPlaybackTargetIsWireless;
      setConnectionState(isWireless ? 'connected' : 'disconnected');
      if (isWireless) setCastType('airplay');
    };
    handleWirelessChange();

    videoElement.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleWirelessChange);
    return () => videoElement.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleWirelessChange);
  }, [videoElement, hasNativeAirPlay]);

  // ══════════════════════════════════════════════════════════════════════════
  // CHROMECAST (Google Cast SDK)
  // ══════════════════════════════════════════════════════════════════════════
  const [chromecastAvailable, setChromecastAvailable] = useState(false);
  const [castSession, setCastSession] = useState<any>(null);

  // Load the Google Cast SDK
  useEffect(() => {
    // Skip if already loaded or if we're on Safari (AirPlay is better there)
    if ((window as any).__gcastLoaded || hasNativeAirPlay) return;

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.head.appendChild(script);
    (window as any).__gcastLoaded = true;

    // The Cast SDK calls this global when ready
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (!isAvailable) return;

      const cast = (window as any).cast;
      const chrome = (window as any).chrome;
      if (!cast || !chrome?.cast) return;

      cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: CAST_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      const context = cast.framework.CastContext.getInstance();

      // Listen for cast state changes
      context.addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        (event: any) => {
          const state = event.castState;
          setChromecastAvailable(
            state === cast.framework.CastState.NOT_CONNECTED ||
            state === cast.framework.CastState.CONNECTED
          );
          if (state === cast.framework.CastState.CONNECTED) {
            setConnectionState('connected');
            setCastType('chromecast');
            setCastSession(context.getCurrentSession());
          } else if (state === cast.framework.CastState.CONNECTING) {
            setConnectionState('connecting');
          } else {
            if (castType === 'chromecast') setConnectionState('disconnected');
            setCastSession(null);
          }
        }
      );

      // Check initial state
      const initialState = context.getCastState();
      setChromecastAvailable(
        initialState === cast.framework.CastState.NOT_CONNECTED ||
        initialState === cast.framework.CastState.CONNECTED
      );
    };

    return () => {
      // Don't remove the script — Cast SDK doesn't like being re-added
    };
  }, [hasNativeAirPlay, castType]);

  // Cast video to Chromecast
  const castToChromecast = useCallback(async () => {
    const cast = (window as any).cast;
    const chrome = (window as any).chrome;
    if (!cast || !chrome?.cast) return;

    const context = cast.framework.CastContext.getInstance();

    try {
      // If not connected, request a session (shows device picker)
      if (!context.getCurrentSession()) {
        await context.requestSession();
      }

      const session = context.getCurrentSession();
      if (!session) return;

      // Get the video URL
      const url = videoUrl || videoElement?.src || videoElement?.currentSrc;
      if (!url) {
        console.error('[CastButton] No video URL available for casting');
        return;
      }

      // Determine content type
      let contentType = 'video/mp4';
      if (url.includes('.m3u8')) contentType = 'application/x-mpegurl';
      else if (url.includes('.webm')) contentType = 'video/webm';

      // Create media info
      const mediaInfo = new chrome.cast.media.MediaInfo(url, contentType);
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = title || 'Crate TV';

      // Load the media
      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;

      // Start from current position if video is playing
      if (videoElement && videoElement.currentTime > 0) {
        request.currentTime = videoElement.currentTime;
      }

      await session.loadMedia(request);

      // Pause local playback
      if (videoElement && !videoElement.paused) {
        videoElement.pause();
      }

    } catch (err: any) {
      // User cancelled the picker — not an error
      if (err?.code === 'cancel') return;
      console.error('[CastButton] Chromecast error:', err);
    }
  }, [videoElement, videoUrl, title]);

  // ══════════════════════════════════════════════════════════════════════════
  // REMOTE PLAYBACK API (fallback for other browsers)
  // ══════════════════════════════════════════════════════════════════════════
  const [remoteAvailable, setRemoteAvailable] = useState(false);

  useEffect(() => {
    if (!videoElement || !('remote' in videoElement)) return;
    // Skip if we already have Chromecast or AirPlay
    if (chromecastAvailable || hasNativeAirPlay) return;

    const remote = (videoElement as any).remote;
    let availabilityId: number | undefined;

    remote.watchAvailability((available: boolean) => {
      setRemoteAvailable(available);
    }).then((id: number) => {
      availabilityId = id;
    }).catch((err: Error) => {
      console.error('[CastButton] Cannot watch remote playback availability:', err);
      setRemoteAvailable(false);
    });

    const handleStateChange = () => {
      const state = remote.state;
      if (state === 'connected') {
        setConnectionState('connected');
        setCastType('remote');
      } else if (state === 'connecting') {
        setConnectionState('connecting');
      } else {
        if (castType === 'remote') setConnectionState('disconnected');
      }
    };
    handleStateChange();

    remote.addEventListener('connect', handleStateChange);
    remote.addEventListener('connecting', handleStateChange);
    remote.addEventListener('disconnect', handleStateChange);

    return () => {
      if (availabilityId !== undefined) {
        try { remote.cancelWatchAvailability(availabilityId); } catch { /* ignore */ }
      }
      remote.removeEventListener('connect', handleStateChange);
      remote.removeEventListener('connecting', handleStateChange);
      remote.removeEventListener('disconnect', handleStateChange);
    };
  }, [videoElement, chromecastAvailable, hasNativeAirPlay, castType]);

  // ══════════════════════════════════════════════════════════════════════════
  // COMBINED AVAILABILITY
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    setIsAvailable(hasNativeAirPlay || chromecastAvailable || remoteAvailable);
  }, [hasNativeAirPlay, chromecastAvailable, remoteAvailable]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLE CAST BUTTON CLICK
  // ══════════════════════════════════════════════════════════════════════════
  const handleCast = () => {
    if (!videoElement && !chromecastAvailable) return;

    // Priority: AirPlay > Chromecast > Remote Playback API
    if (hasNativeAirPlay) {
      try {
        (videoElement as any).webkitShowPlaybackTargetPicker();
      } catch (err) {
        console.error('[CastButton] Error opening AirPlay picker:', err);
      }
      return;
    }

    if (chromecastAvailable) {
      castToChromecast();
      return;
    }

    if (remoteAvailable && videoElement && 'remote' in videoElement) {
      (videoElement as any).remote.prompt().catch((err: Error) => {
        if (err.name !== 'AbortError') {
          console.error('[CastButton] Error prompting for remote playback:', err);
        }
      });
      return;
    }
  };

  // Don't render if no casting is available
  if (!isAvailable) return null;

  const iconColor = connectionState === 'connected' ? 'text-red-500' : 'text-white';
  const label = connectionState === 'connected'
    ? `Connected via ${castType === 'airplay' ? 'AirPlay' : castType === 'chromecast' ? 'Chromecast' : 'TV'}`
    : 'Cast to device';

  return (
    <button
      onClick={handleCast}
      className={`absolute top-4 right-4 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors z-30 ${iconColor} ${connectionState === 'connecting' ? 'animate-pulse' : ''}`}
      aria-label={label}
      title={label}
    >
      {/* Cast icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
      </svg>
    </button>
  );
};

export default CastButton;
