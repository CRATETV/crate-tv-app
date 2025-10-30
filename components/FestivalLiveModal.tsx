import React, { useEffect } from 'react';

interface FestivalLiveModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

const FestivalLiveModal: React.FC<FestivalLiveModalProps> = ({ onClose, onNavigate }) => {
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

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative border border-purple-700 text-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
            <div className="flex justify-center mb-4">
                 <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-red-400 font-bold text-lg">LIVE</span>
                 </div>
            </div>
          <h2 className="text-3xl font-bold text-white mb-3">The Film Festival is LIVE!</h2>
          <p className="text-gray-300 mb-8">
            Join us now to watch exclusive short films, discover new filmmakers, and celebrate independent cinema.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
                onClick={onNavigate}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg"
            >
                Explore Festival
            </button>
            <button 
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg"
            >
                Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FestivalLiveModal;