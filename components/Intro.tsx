
import React from 'react';

interface IntroProps {
  onIntroEnd: () => void;
}

const Intro: React.FC<IntroProps> = ({ onIntroEnd }) => {
  return (
    <div className="relative w-screen h-screen">
      <video
        id="intro-video"
        className="absolute top-0 left-0 w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        onEnded={onIntroEnd}
      >
        <source src="https://cratetelevision.s3.us-east-1.amazonaws.com/intro+video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
      </div>
    </div>
  );
};

export default Intro;
