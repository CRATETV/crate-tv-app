
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-red-500"></div>
        <div className="absolute top-1/2 left-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 border-4 border-dashed rounded-full animate-spin border-blue-500" style={{ animationDirection: 'reverse' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
