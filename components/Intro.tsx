import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Corrected URLs to use %20 for spaces, which is the standard for URL path segments.
  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/CRATE%20INTO%202%20SECONDS.mp4";
  const mobileSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/CRATE%20INTO%202%20SECONDS.mp4"; 

  const getInitialVideoSrc = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia("(max-width: 768px)").matches ? mobileSrc : desktopSrc;
    }
    return desktopSrc;
  };

  const [videoSrc, setVideoSrc] = useState(getInitialVideoSrc);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleResize = (e: MediaQueryListEvent) => {
      setVideoSrc(e.matches ? mobileSrc : desktopSrc);
    };
    mediaQuery.addEventListener('change', handleResize);
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, [desktopSrc, mobileSrc]);
  
  // A more robust effect to handle video playback, ensuring it starts reliably.
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const playVideo = () => {
        // Attempt to play the video. The `muted` prop on the video tag is crucial for this to succeed.
        const promise = videoElement.play();
        if (promise !== undefined) {
          promise.catch(error => {
            // Autoplay was prevented by the browser (e.g., in low power mode).
            console.warn("Autoplay was prevented, bypassing intro video.", error);
            // Skip the intro directly to improve UX if autoplay fails.
            onIntroEnd();
          });
        }
      };

      // Check if the video is already ready to play to avoid race conditions.
      // HAVE_FUTURE_DATA (readyState 3) means we have enough data to start playing.
      if (videoElement.readyState >= 3) {
        playVideo();
      } else {
        // If not ready, wait for the 'canplay' event.
        // { once: true } automatically removes the listener after it runs.
        videoElement.addEventListener('canplay', playVideo, { once: true });
      }
    }
  }, [videoSrc, onIntroEnd]); // Rerun this effect if the video source changes

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        ref={videoRef}
        id="intro-video"
        key={videoSrc}
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay // Hint to the browser to start playing
        muted
        playsInline
        preload="auto"
        onEnded={onIntroEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        poster="https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg"
        src={videoSrc}
      >
        Your browser does not support the video tag.
      </video>

      {/* Show Skip Intro button only when video is successfully playing */}
      {isPlaying && (
        <button
            onClick={onIntroEnd}
            className="absolute bottom-8 right-8 bg-black/40 text-white/80 text-sm px-4 py-2 rounded-md backdrop-blur-sm hover:bg-black/60 hover:text-white transition-all animate-[fadeIn_0.5s_ease-out] [animation-delay:1s] opacity-0 [animation-fill-mode:forwards]"
            aria-label="Skip intro"
        >
            Skip Intro
        </button>
      )}
    </div>
  );
};

export default Intro;