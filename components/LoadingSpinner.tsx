
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', fullScreen = true }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const insetClasses = {
    sm: 'inset-1',
    md: 'inset-3',
    lg: 'inset-5'
  };

  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen bg-black' : ''}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-dashed rounded-full animate-spin border-red-500"></div>
        <div className={`absolute ${insetClasses[size]} border-4 border-dashed rounded-full animate-spin border-blue-500`} style={{ animationDirection: 'reverse' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
