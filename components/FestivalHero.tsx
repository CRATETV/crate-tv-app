import React from 'react';
import { FestivalConfig } from '../types';

interface FestivalHeroProps {
  festivalConfig: FestivalConfig | null;
}

const FestivalHero: React.FC<FestivalHeroProps> = ({ festivalConfig }) => {
  if (!festivalConfig) {
    return <div className="w-full h-[56.25vw] bg-gray-900 animate-pulse"></div>;
  }

  const handleNavigate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.history.pushState({}, '', '/festival');
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <div className="relative w-full h-[56.25vw] max-h-[70vh] bg-black overflow-hidden">
      {/* Background with a subtle animation */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-red-900 to-black animate-[pulse_10s_ease-in-out_infinite]"
        style={{ animationDirection: 'alternate' }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 pb-24 md:pb-16 text-white items-center text-center">
        <div className="bg-red-600 text-white font-bold text-sm px-4 py-1 rounded-full mb-4 animate-[slideInUp_0.5s_ease-out]">
          FESTIVAL IS LIVE NOW
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 max-w-3xl animate-[slideInUp_0.7s_ease-out] drop-shadow-lg">
          {festivalConfig.title}
        </h1>
        <p className="text-sm md:text-base lg:text-lg max-w-xl mb-8 animate-[slideInUp_0.9s_ease-out]">
          {festivalConfig.description}
        </p>
        <div className="animate-[slideInUp_1.1s_ease-out]">
          <button
            onClick={handleNavigate}
            className="flex items-center justify-center px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-300 transition-colors text-lg"
          >
            Explore the Festival
          </button>
        </div>
      </div>
    </div>
  );
};

export default FestivalHero;