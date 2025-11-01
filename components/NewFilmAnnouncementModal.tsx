import React, { useEffect, useState } from 'react';
import { Movie } from '../types';

interface NewFilmAnnouncementModalProps {
  movie: Movie;
  onClose: () => void;
  onWatchNow: () => void;
}

const NewFilmAnnouncementModal: React.FC<NewFilmAnnouncementModalProps> = ({ movie, onClose, onWatchNow }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const synopsisIsLong = movie.synopsis && movie.synopsis.length > 200;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.5s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border-2 border-red-500" 
        onClick={(e) => e.stopPropagation()}
      >
        <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative z-10 p-8 flex flex-col items-center text-center">
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight" style={{textShadow: '0 2px 5px rgba(255,0,0,0.5)'}}>Now Playing!</h2>
            <img src={movie.poster} alt={movie.title} className="w-48 h-auto rounded-md shadow-lg my-4 border-2 border-gray-600" />
            <h3 className="text-3xl font-bold text-white mb-3">{movie.title}</h3>
            <div className="text-gray-300 mb-8">
              <p className={!isExpanded && synopsisIsLong ? 'line-clamp-3' : ''} dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
              {synopsisIsLong && !isExpanded && (
                <button onClick={() => setIsExpanded(true)} className="text-red-400 hover:underline text-sm font-bold mt-1">
                  Read More
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button 
                    onClick={onWatchNow}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-md transition-transform hover:scale-105 text-lg"
                >
                    Watch Now
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

export default NewFilmAnnouncementModal;