
import React, { useEffect } from 'react';
import { FilmBlock, Movie } from '../types.ts';

interface FilmBlockDetailsModalProps {
  block: FilmBlock;
  onClose: () => void;
  isFilmUnlocked: (filmKey: string, blockId: string) => boolean;
  isBlockUnlocked: (blockId: string) => boolean;
  onWatchMovie: (movieKey: string) => void;
  allMovies: Record<string, Movie>;
}

const FilmBlockDetailsModal: React.FC<FilmBlockDetailsModalProps> = ({
  block,
  onClose,
  isFilmUnlocked,
  isBlockUnlocked,
  onWatchMovie,
  allMovies
}) => {
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

  const blockMovies = block.movieKeys.map(key => allMovies[key]).filter(Boolean);
  const blockIsUnlocked = isBlockUnlocked(block.id);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-700" 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-3xl font-bold text-white mb-2">{block.title}</h2>
          <p className="text-gray-400 mb-6">{blockMovies.length} films in this block.</p>
          
          {/* Mobile-first list view */}
          <div className="space-y-4 mb-8">
            {blockMovies.map(movie => {
              const filmIsUnlocked = isFilmUnlocked(movie.key, block.id);
              return (
                <div key={movie.key} className="flex items-center gap-4 bg-gray-800/50 p-2 rounded-lg">
                    <div className="flex-shrink-0 w-20 aspect-[3/4] rounded-md overflow-hidden">
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                        <h4 className="text-white font-semibold">{movie.title}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2 hidden sm:block">
                            {movie.synopsis.replace(/<br\s*\/?>/gi, ' ')}
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        {filmIsUnlocked ? (
                            <button onClick={() => onWatchMovie(movie.key)} className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-md transition-colors">Watch</button>
                        ) : (
                            <div className="bg-gray-600 text-white text-sm font-bold py-2 px-4 rounded-md text-center cursor-not-allowed" title="Payments are temporarily unavailable">Unlock - $5</div>
                        )}
                    </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            {blockIsUnlocked ? (
              <p className="text-green-400 font-semibold">✓ You have access to all films in this block.</p>
            ) : (
              <div>
                <h3 className="text-xl text-white mb-2">Unlock this block for $10.00</h3>
                <p className="text-gray-400 mb-4">Gain access to all {blockMovies.length} films in the "{block.title}" block.</p>
                 <div className="bg-gray-700 text-gray-400 font-bold py-3 px-6 rounded-lg inline-block cursor-not-allowed" title="Payments are temporarily unavailable">
                    Unlock Block
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilmBlockDetailsModal;