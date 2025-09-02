
import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/mobile+intro+that+matches+webapp.mp4";
  const mobileSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro+for+cellphone1080p.mp4"; 

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
  
  // Attempt to autoplay the video. If it fails, skip the intro.
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Muted autoplay is generally allowed, but some browsers/modes (like iOS Low Power Mode) can block it.
      videoElement.play().catch(error => {
        // Autoplay was prevented by the browser.
        console.warn("Autoplay was prevented, bypassing intro video as requested.", error);
        // Instead of showing a play button, we skip the intro directly to improve UX.
        onIntroEnd();
      });
    }
  }, [videoSrc, onIntroEnd]); // Rerun when video source changes

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        ref={videoRef}
        id="intro-video"
        key={videoSrc}
        className="absolute top-0 left-0 w-full h-full object-cover"
        muted
        playsInline
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