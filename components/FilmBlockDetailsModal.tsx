import React, { useEffect } from 'react';
import { Movie, FilmBlock } from '../types.ts';

interface FilmBlockDetailsModalProps {
    block: FilmBlock;
    allMovies: Record<string, Movie>;
    onClose: () => void;
    // In a real app, you would pass functions to handle purchases
    // onPurchaseBlock: (blockId: string) => void;
    // onPurchaseMovie: (movieId: string) => void;
}

const FilmBlockDetailsModal: React.FC<FilmBlockDetailsModalProps> = ({ block, allMovies, onClose }) => {

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

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-700" 
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8">
                    <h2 className="text-3xl font-bold text-white mb-2">{block.title}</h2>
                    <p className="text-purple-300 font-semibold mb-6">{block.time}</p>
                    
                    <div 
                      className="mb-6 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 cursor-not-allowed shadow-md text-center"
                      title="Payments are temporarily unavailable"
                    >
                        Unlock This Block - $10.00
                    </div>

                    <div className="space-y-4">
                        {blockMovies.map(movie => (
                            <div key={movie.key} className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-20 aspect-[3/4] rounded-md overflow-hidden">
                                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="text-white text-lg font-semibold">{movie.title}</h4>
                                    <p className="text-sm text-gray-400">by {movie.director}</p>
                                </div>
                                <div 
                                    className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors cursor-not-allowed text-sm"
                                    title="Payments are temporarily unavailable"
                                >
                                    Unlock - $5.00
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilmBlockDetailsModal;
