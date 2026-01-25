import React from 'react';
import { FestivalConfig, CrateFestConfig } from '../types';

interface FestivalHeroProps {
  config: FestivalConfig | CrateFestConfig | null;
}

const FestivalHero: React.FC<FestivalHeroProps> = ({ config }) => {
  if (!config) {
    return <div className="w-full h-[56.25vw] bg-gray-900 animate-pulse"></div>;
  }

  const title = config.title || 'Official Event';
  const subheader = ('tagline' in config) ? (config as CrateFestConfig).tagline : (config as FestivalConfig).subheader;
  const description = ('description' in config) ? (config as FestivalConfig).description : (config as CrateFestConfig).tagline;

  return (
    <div className="relative w-full h-[85vh] sm:h-[75vh] bg-black overflow-hidden flex items-center justify-center">
      {/* KINETIC AURORA BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#050505]"></div>
        {/* Shifting Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-[pulse_8s_infinite] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[120px] rounded-full animate-[pulse_10s_infinite_reverse] mix-blend-screen"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse"></div>
      </div>
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.15] pointer-events-none z-1"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 py-12 text-white items-center text-center max-w-7xl mx-auto">
        <div className="space-y-6 mb-10 animate-[slideInUp_0.7s_ease-out]">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600/20 to-purple-600/20 border border-red-500/30 px-6 py-2 rounded-full mb-2 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></span>
                <p className="text-red-400 font-black uppercase tracking-[0.5em] text-[10px] drop-shadow-md">
                    {subheader || 'Live Event'}
                </p>
            </div>
            
            {/* PRISMATIC HEADLINE */}
            <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-red-600/20 scale-110 opacity-50 -z-10 animate-pulse"></div>
                <h1 className="text-5xl md:text-7xl lg:text-[8rem] font-black max-w-6xl drop-shadow-[0_15px_40px_rgba(0,0,0,0.8)] uppercase tracking-tighter italic leading-[0.85] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-400">
                    {title}
                </h1>
            </div>
        </div>
        
        <p className="text-lg md:text-xl lg:text-2xl max-w-3xl mb-14 animate-[slideInUp_0.9s_ease-out] text-gray-300 font-medium leading-tight italic drop-shadow-2xl">
          {description}
        </p>
      </div>

      {/* Cinematic Fog Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-20"></div>
    </div>
  );
};

export default FestivalHero;