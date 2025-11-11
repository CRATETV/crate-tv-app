import React from 'react';

interface UpdateBannerProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onRefresh, onDismiss }) => {
  return (
    <div 
        className="fixed bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-50 bg-gray-800/90 backdrop-blur-md text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 animate-[slideInUp_0.5s_ease-out]"
        role="alert"
    >
      <div className="flex-grow">
        <h3 className="font-bold">Update Available</h3>
        <p className="text-sm text-gray-300">A new version of Crate TV is ready.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors text-2xl"
          aria-label="Dismiss update notification"
        >
          &times;
        </button>
        <button
          onClick={onRefresh}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;