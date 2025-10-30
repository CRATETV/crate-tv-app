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

  const renderInstructions = () => {
    if (isIOS) {
      return (
        <>
          <p className="text-gray-300 mb-6 text-lg">
            To add Crate TV to your Home Screen, tap the <span className="font-bold text-white">Share</span> icon in Safari and then select '<span className="font-bold text-white">Add to Home Screen</span>'.
          </p>
          <div className="flex justify-center items-center gap-2 bg-gray-700/50 border border-gray-600 p-2 rounded-lg">
            {/* iOS Share Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 8v8m-4-4h8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4V2M12 12v-2" />
                <path d="M12 12a2 2 0 100-4 2 2 0 000 4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12h-1M4 12H3" />
            </svg>
            <span className="font-semibold text-white">Share</span>
            <span className="text-gray-400 mx-2">&rarr;</span>
            {/* Add to Home Screen Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-white">Add to Home Screen</span>
          </div>
        </>
      );
    }
    // Generic instructions for other browsers
    return (
      <p className="text-gray-300 mb-6 text-lg">
        To install this app, look for an "Install" button or "Add to Home Screen" option in your browser's menu.
      </p>
    );
  };

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
          {renderInstructions()}
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