
import React, { useEffect } from 'react';
import { Movie } from '../types.ts';
import MovieCard from './MovieCard.tsx';

interface ComingSoonModalProps {
  movies: Movie[];
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ movies, onClose, onSelectMovie }) => {
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
        className="bg-[#181818] rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative scrollbar-hide border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 bg-black/50 rounded-full p-1.5 hover:text-white z-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6 md:p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Coming Soon to Crate TV</h2>
            {movies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {movies.map(movie => (
                        <MovieCard key={movie.key} movie={movie} onSelectMovie={onSelectMovie} />
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">No upcoming films have been announced yet. Check back soon!</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;
