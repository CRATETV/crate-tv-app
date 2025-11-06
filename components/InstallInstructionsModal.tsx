import React, { useEffect } from 'react';

interface InstallInstructionsModalProps {
  onClose: () => void;
}

const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({ onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Simple user agent check for iOS devices.
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-gray-700 text-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-4">Install Crate TV</h2>
          {isIOS ? (
            <>
              <p className="text-gray-300 mb-6 text-lg">
                To add Crate TV to your Home Screen, tap the <span className="font-bold text-white">Share</span> icon in Safari, then select '<span className="font-bold text-white">Add to Home Screen</span>'.
              </p>
              <div className="flex items-center justify-center text-center p-4 bg-gray-800 rounded-lg">
                  <p className="text-lg font-semibold">Tap <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ios-share.png" alt="iOS Share Icon" className="w-6 h-6 inline-block mx-1" />, then 'Add to Home Screen'</p>
              </div>
            </>
          ) : (
             <p className="text-gray-300 mb-6 text-lg">
                To install this app, look for an "Install" button or "Add to Home Screen" option in your browser's menu.
            </p>
          )}
          <button 
            onClick={onClose}
            className="mt-8 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallInstructionsModal;