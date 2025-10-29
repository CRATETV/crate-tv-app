import React, { useMemo, useEffect } from 'react';
import { Movie } from '../types';

interface DirectorCreditsModalProps {
  directorName: string;
  onClose: () => void;
  allMovies: Record<string, Movie>;
  onSelectMovie: (movie: Movie) => void;
}

const CreditMovieCard: React.FC<{ movie: Movie; onClick: (movie: Movie) => void }> = ({ movie, onClick }) => {
    return (
        <div
            className="group cursor-pointer aspect-[3/4] rounded-md overflow-hidden bg-gray-800 transition-transform duration-300 hover:scale-105"
            onClick={() => onClick(movie)}
        >
            <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
                loading="lazy"
            />
        </div>
    );
};

const DirectorCreditsModal: React.FC<DirectorCreditsModalProps> = ({ directorName, onClose, allMovies, onSelectMovie }) => {
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

  const credits = useMemo(() => {
    const directedMovies: Movie[] = [];
    const actedInMovies: Movie[] = [];
    
    Object.values(allMovies).forEach((movie: Movie) => {
      // Check directed movies
      if (movie.director.split(',').map(d => d.trim()).includes(directorName)) {
        directedMovies.push(movie);
      }
      
      // Check acted in movies
      if (movie.cast.some(actor => actor.name === directorName)) {
        actedInMovies.push(movie);
      }
    });
    
    return { directedMovies, actedInMovies };
  }, [directorName, allMovies]);

  const hasCredits = credits.directedMovies.length > 0 || credits.actedInMovies.length > 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Films by {directorName}</h2>

            {!hasCredits && (
                <p className="text-gray-400 text-center py-8">No other films by {directorName} found on Crate TV.</p>
            )}

            {credits.directedMovies.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-red-400 mb-4">Directed</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {credits.directedMovies.map(movie => (
                            <CreditMovieCard key={movie.key} movie={movie} onClick={onSelectMovie} />
                        ))}
                    </div>
                </div>
            )}
            
            {credits.actedInMovies.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-red-400 mb-4">Also Starring In</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {credits.actedInMovies.map(movie => (
                            <CreditMovieCard key={movie.key} movie={movie} onClick={onSelectMovie} />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DirectorCreditsModal;