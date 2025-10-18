import React, { useEffect } from 'react';
import { FestivalConfig } from '../types';

interface FestivalLiveModalProps {
  config: FestivalConfig;
  onClose: () => void;
  onNavigate: () => void;
}

const FestivalLiveModal: React.FC<FestivalLiveModalProps> = ({ config, onClose, onNavigate }) => {
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
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-gray-700 text-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
            <div className="flex justify-center mb-4">
                 <div className="w-16 h-16 bg-purple-500/20 border-2 border-purple-500 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2zM4 8a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V9a1 1 0 00-1-1H4z" />
                    </svg>
                 </div>
            </div>
          <h2 className="text-3xl font-bold text-white mb-3">The Festival is Live!</h2>
          <p className="text-gray-300 mb-6">
            Join us for the <strong className="text-purple-300">{config.title}</strong>. Explore a diverse lineup of comedies, dramas, and more from emerging filmmakers.
          </p>
          <button 
            onClick={onNavigate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg"
          >
            Explore the Festival
          </button>
        </div>
      </div>
    </div>
  );
};

export default FestivalLiveModal;
