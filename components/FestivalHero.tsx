
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
    <div className="relative w-full h-[80vh] sm:h-[70vh] bg-black overflow-hidden">
      {/* Background with a subtle animation */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-red-900 to-black animate-[pulse_10s_ease-in-out_infinite]"
        style={{ animationDirection: 'alternate' }}
      ></div>
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 py-12 text-white items-center text-center">
        <div className="space-y-2 mb-6 animate-[slideInUp_0.7s_ease-out]">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold max-w-4xl drop-shadow-lg uppercase tracking-tighter italic">
            {festivalConfig.title}
            </h1>
            {festivalConfig.subheader && (
                <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] md:text-sm drop-shadow-md">
                    {festivalConfig.subheader}
                </p>
            )}
        </div>
        <p className="text-sm md:text-base lg:text-lg max-w-xl mb-12 animate-[slideInUp_0.9s_ease-out] text-gray-300 font-medium">
          {festivalConfig.description}
        </p>
        <div className="animate-[slideInUp_1.1s_ease-out]">
          <button
            onClick={handleNavigate}
            className="flex items-center justify-center px-12 py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95 text-xs uppercase tracking-widest shadow-2xl"
          >
            Explore Official Selections
          </button>
        </div>
      </div>
    </div>
  );
};

export default FestivalHero;
