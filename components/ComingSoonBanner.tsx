import React from 'react';

interface ComingSoonBannerProps {
  onClick: () => void;
}

const ComingSoonBanner: React.FC<ComingSoonBannerProps> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-r from-purple-800 via-red-800 to-yellow-600 cursor-pointer z-[45] group overflow-hidden"
      role="button"
      aria-label="View upcoming films"
    >
      {/* Shimmer Effect */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-transparent animate-[shimmer_4s_ease-in-out_infinite] bg-[linear-gradient(110deg,rgba(255,255,255,0)_40%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0)_60%)]"
        style={{ backgroundSize: '200% 100%' }}
      ></div>

      <div className="relative z-10 w-full h-full flex items-center justify-center gap-4 px-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-white font-bold text-lg uppercase tracking-wider group-hover:scale-105 transition-transform duration-300">
          Coming Soon
        </span>
        <span className="hidden sm:inline text-white/80 text-sm ml-4">Click to see what's next</span>
      </div>
    </div>
  );
};

export default ComingSoonBanner;