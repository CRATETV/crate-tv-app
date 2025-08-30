
import React, { useState, useEffect } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro%20red%20.mp4";
  // This is the new 9:16 aspect ratio video for mobile devices.
  const mobileSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro+for+cellphone1080p.mp4"; 

  const getInitialVideoSrc = () => {
    // Check window object to prevent errors in non-browser environments
    if (typeof window !== 'undefined') {
      return window.matchMedia("(max-width: 768px)").matches ? mobileSrc : desktopSrc;
    }
    // Default to desktop for SSR or other environments
    return desktopSrc;
  };

  const [videoSrc, setVideoSrc] = useState(getInitialVideoSrc);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleResize = (e: MediaQueryListEvent) => {
      setVideoSrc(e.matches ? mobileSrc : desktopSrc);
    };

    // Listen for changes in screen size
    mediaQuery.addEventListener('change', handleResize);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, [desktopSrc, mobileSrc]);

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        id="intro-video"
        key={videoSrc} // Using key to force re-mount on src change, ensuring the new video loads reliably
        className="absolute top-0 left-0 w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        onEnded={onIntroEnd}
        poster="https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg"
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
      </div>
    </div>
  );
};

export default Intro;
