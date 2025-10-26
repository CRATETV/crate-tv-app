import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/mobile+intro+that+matches+webapp.mp4";
  const mobileSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro+for+cellphone1080p.mp4"; 

  const getInitialVideoSrc = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia("(max-width: 768px)").matches ? mobileSrc : desktopSrc;
    }
    return desktopSrc;
  };

  const [videoSrc, setVideoSrc] = useState(getInitialVideoSrc);
  
  // This effect manages the intro video playback and has a failsafe.
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Attempt to play the video. If autoplay is blocked by the browser, skip the intro.
      videoElement.play().catch(error => {
        console.warn("Autoplay was prevented by the browser. Skipping intro.", error);
        onIntroEnd();
      });
    }

    // Failsafe timer. If the intro hasn't completed after 7 seconds for any reason, force it.
    const failsafeTimer = setTimeout(() => {
      console.warn("Intro failsafe triggered. Proceeding to main application.");
      onIntroEnd();
    }, 7000);

    return () => {
      clearTimeout(failsafeTimer);
    };
  }, [onIntroEnd]);

  // This effect handles swapping the video source for responsive design.
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


  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Video Player Container */}
      <div className="absolute top-0 left-0 w-full h-full">
        <video
          ref={videoRef}
          key={videoSrc}
          className="absolute top-0 left-0 w-full h-full object-cover"
          muted
          playsInline
          onEnded={onIntroEnd}
          poster="https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg"
          src={videoSrc}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Skip Intro button */}
      <button
          onClick={onIntroEnd}
          className="absolute bottom-8 right-8 bg-black/40 text-white/80 text-sm px-4 py-2 rounded-md backdrop-blur-sm hover:bg-black/60 hover:text-white transition-all animate-[fadeIn_0.5s_ease-out]"
          aria-label="Skip intro"
      >
          Skip Intro
      </button>
    </div>
  );
};

export default Intro;