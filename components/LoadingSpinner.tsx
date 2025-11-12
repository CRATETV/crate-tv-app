
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-dashed rounded-full animate-spin border-red-500"></div>
        <div className="absolute inset-3 border-4 border-dashed rounded-full animate-spin border-blue-500" style={{ animationDirection: 'reverse' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
