import React from 'react';

interface InstallPwaBannerProps {
  onInstallClick: () => void;
  onDismiss: () => void;
}

const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ onInstallClick, onDismiss }) => {
  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-50 bg-gray-800/90 backdrop-blur-md text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 animate-[slideInUp_0.5s_ease-out]">
      <div className="flex-shrink-0">
        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/favicons/favicon-96x96.png" alt="Crate TV Logo" className="w-12 h-12" />
      </div>
      <div className="flex-grow">
        <h3 className="font-bold">Get the Crate TV App!</h3>
        <p className="text-sm text-gray-300">Install for a faster, full-screen experience.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors text-2xl"
          aria-label="Dismiss install prompt"
        >
          &times;
        </button>
        <button
          onClick={onInstallClick}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm"
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPwaBanner;