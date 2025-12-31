import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // New professional intro master file
  const introSrc = "https://cratetelevision.s3.us-east-1.amazonaws.com/New+Intro+.mp4";

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Attempt to play the video. If autoplay is blocked by the browser, skip the intro.
      videoElement.play().catch(error => {
        console.warn("Autoplay was prevented by the browser. Skipping intro.", error);
        onIntroEnd();
      });
    }

    // Failsafe timer. Set to 10 seconds to allow the full professional reveal to play.
    const failsafeTimer = setTimeout(() => {
      console.warn("Intro failsafe triggered. Proceeding to main application.");
      onIntroEnd();
    }, 10000);

    return () => {
      clearTimeout(failsafeTimer);
    };
  }, [onIntroEnd]);

  return (
    <div className="relative w-screen h-[100svh] bg-black overflow-hidden flex items-center justify-center">
      {/* Cinematic Video Layer */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted
          playsInline
          onEnded={onIntroEnd}
          src={introSrc}
          aria-hidden="true"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Skip Intro button - Discrete but accessible */}
      <button
          onClick={onIntroEnd}
          className="absolute bottom-10 right-8 z-50 bg-white/5 text-white/30 text-[9px] font-black uppercase tracking-[0.5em] px-6 py-3 rounded-full border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:text-white transition-all animate-[fadeIn_2s_ease-out] shadow-2xl"
          aria-label="Skip intro"
      >
          Skip Intro
      </button>

      {/* Dynamic branding watermark */}
      <div className="absolute bottom-10 left-10 z-50 pointer-events-none animate-[fadeIn_3s_ease-out] hidden sm:block">
         <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.8em] mr-[-0.8em]">Crate Infrastructure V4.0</p>
         </div>
      </div>
    </div>
  );
};

export default Intro;