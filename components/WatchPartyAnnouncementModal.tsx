import React, { useEffect } from 'react';
import { Movie } from '../types';

interface WatchPartyAnnouncementModalProps {
  movie: Movie;
  onClose: () => void;
  onJoin: () => void;
}

const WatchPartyAnnouncementModal: React.FC<WatchPartyAnnouncementModalProps> = ({ movie, onClose, onJoin }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.5s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border-2 border-purple-500"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" crossOrigin="anonymous"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative z-10 p-8 flex flex-col items-center text-center">
            <div className="flex justify-center mb-4">
                 <div className="bg-red-600 text-white font-bold text-lg px-6 py-2 rounded-full animate-pulse">
                    LIVE NOW
                 </div>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Watch Party Starting!</h2>
            <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt={movie.title} className="w-40 h-auto rounded-md shadow-lg my-4 border-2 border-gray-600" crossOrigin="anonymous"/>
            <h3 className="text-2xl font-bold text-white mb-6">"{movie.title}"</h3>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button 
                    onClick={onJoin}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md transition-transform hover:scale-105 text-lg"
                >
                    Join the Party
                </button>
                <button 
                    onClick={onClose}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-md transition-colors text-lg"
                >
                    Dismiss
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPartyAnnouncementModal;