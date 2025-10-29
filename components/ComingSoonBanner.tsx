import React from 'react';

const ComingSoonBanner: React.FC = () => {
  const handleNavigate = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    window.history.pushState({}, '', '/coming-soon');
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <div
      onClick={handleNavigate}
      className="fixed bottom-0 left-0 w-full h-16 bg-black/50 backdrop-blur-md border-t border-gray-800 cursor-pointer z-40 flex items-center justify-center group"
      role="button"
      aria-label="View upcoming films"
    >
      <div className="flex items-center justify-center gap-4 text-white transition-all duration-300 group-hover:bg-gray-800/50 px-6 py-2 rounded-full">
        <span className="text-lg font-semibold tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
          Discover What's Coming Soon
        </span>
        <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-hover:border-red-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonBanner;