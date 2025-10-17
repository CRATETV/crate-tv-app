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
    // This is a failsafe timer. If the intro hasn't completed or been skipped
    // after 7 seconds for any reason (e.g., video loading error, browser issue),
    // this will automatically move the user to the main application to prevent
    // them from being stuck.
    const failsafeTimer = setTimeout(() => {
      console.warn("Intro failsafe triggered. Proceeding to main application.");
      onIntroEnd();
    }, 7000); // 7-second failsafe

    return () => {
      clearTimeout(failsafeTimer);
    };
  }, [onIntroEnd]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleResize = (e: MediaQueryListEvent) => {
      setVideoSrc(e.matches ? mobileSrc : desktopSrc);
    };
    mediaQuery.addEventListener('change', handleResize);
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Set up a timeout to detect silent autoplay failures.
      const autoplayCheckTimeout = setTimeout(() => {
        // If the video is still paused after 1 second, assume autoplay failed and skip intro.
        if (videoElement.paused) {
          console.warn("Autoplay seems to have failed silently. Skipping intro.");
          onIntroEnd();
        }
      }, 1000); // Check after 1 second

      videoElement.play().then(() => {
        // Autoplay started successfully, clear the safety timeout.
        clearTimeout(autoplayCheckTimeout);
      }).catch(error => {
        // Autoplay was explicitly prevented by the browser. Skip intro.
        clearTimeout(autoplayCheckTimeout);
        console.warn("Autoplay was prevented by the browser. Skipping intro.", error);
        onIntroEnd();
      });

      return () => clearTimeout(autoplayCheckTimeout);
    }
  }, [videoSrc, onIntroEnd]);

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        ref={videoRef}
        id="intro-video"
        key={videoSrc}
        className="absolute top-0 left-0 w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        onEnded={onIntroEnd}
        onPlay={() => setIsPlaying(true)}
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