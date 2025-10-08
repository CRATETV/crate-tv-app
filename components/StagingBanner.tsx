import React from 'react';

interface StagingBannerProps {
  onExit: () => void;
  isOffline: boolean;
}

const StagingBanner: React.FC<StagingBannerProps> = ({ onExit, isOffline }) => {
  return (
    <div className={`bg-yellow-500 text-black text-center py-1.5 px-4 fixed w-full z-[100] h-8 flex items-center justify-center text-sm top-0`}>
      <span className="font-bold mr-2">Staging Environment</span>
      <span className="hidden sm:inline">- You are viewing a preview of the site.</span>
      <button 
        onClick={onExit} 
        className="ml-4 font-bold underline hover:text-gray-800"
        aria-label="Exit staging environment"
      >
        Exit
      </button>
    </div>
  );
};

export default StagingBanner;