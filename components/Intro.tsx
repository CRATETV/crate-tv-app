
import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // FIX: Corrected the S3 URL for the desktop video. The old URL used an incorrect
  // 's3-us-east-1' format instead of 's3.us-east-1'.
  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro%20red%20.mp4";
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

  // Effect to programmatically play the video to improve autoplay reliability
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Autoplay was prevented:", error);
          // This catch is to prevent unhandled promise rejection errors.
          // The video element's `autoplay` and `muted` attributes handle most cases.
        });
      }
    }
  }, [videoSrc]);

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        ref={videoRef}
        id="intro-video"
        key={videoSrc} // Using key forces a re-mount on src change, ensuring the new video loads
        className="absolute top-0 left-0 w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        onEnded={onIntroEnd}
        poster="https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg"
        src={videoSrc} // Use src attribute for single source
      >
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
      </div>
    </div>
  );
};

export default Intro;
