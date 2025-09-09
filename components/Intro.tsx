import React, { useState, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const desktopSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/CRATE%20INTO%202%20SECONDS.mp4";
  const mobileSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/intro+for+cellphone1080p.mp4";

  // This function will be called if the video file fails to load or has a playback error.
  const handleVideoError = () => {
    console.error("Intro video failed to load or play. Skipping intro.");
    onIntroEnd();
  };

  return (
    <div className="relative w-screen h-screen bg-black">
      <video
        ref={videoRef}
        id="intro-video"
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={onIntroEnd}
        onError={handleVideoError} // Add a direct error handler
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        poster="https://cratetelevision.s3.us-east-1.amazonaws.com/intro-poster.jpg"
      >
        {/* Use source tags for responsive video - this is more reliable than JS-based switching */}
        <source src={mobileSrc} type="video/mp4" media="(max-width: 768px)" />
        <source src={desktopSrc} type="video/mp4" media="(min-width: 769px)" />
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