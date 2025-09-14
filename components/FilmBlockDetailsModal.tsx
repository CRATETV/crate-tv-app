import React, { useEffect } from 'react';
import { FilmBlock, Movie } from '../types.ts';

interface FilmBlockDetailsModalProps {
    block: FilmBlock;
    onClose: () => void;
    isFilmUnlocked: (filmKey: string, blockId: string) => boolean;
    isBlockUnlocked: (blockId: string) => boolean;
    onWatchMovie: (filmKey: string) => void;
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
            if (event.key === 'Escape') onClose();
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div
                className="bg-[#181818] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-hide border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-[#181818] p-6 z-10 border-b border-gray-700">
                     <h2 className="text-3xl font-bold text-white text-center">{block.title}</h2>
                     <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 bg-black/50 rounded-full p-1.5 hover:text-white z-20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    {blockMovies.map(movie => {
                        const filmIsUnlocked = isFilmUnlocked(movie.key, block.id);
                        return (
                            <div key={movie.key} className="flex flex-col md:flex-row gap-6 bg-gray-800/50 p-4 rounded-lg">
                                <div className="md:w-1/4 flex-shrink-0">
                                    <img src={movie.poster} alt={movie.title} className="w-full rounded-md object-cover aspect-[3/4]" />
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-2xl font-bold text-white mb-2">{movie.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-4" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                                </div>
                                <div className="md:w-1/4 flex-shrink-0 flex items-center justify-center">
                                     {filmIsUnlocked ? (
                                        <button onClick={() => onWatchMovie(movie.key)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                            Watch Now
                                        </button>
                                     ) : (
                                        <div className="w-full text-center bg-gray-700 text-gray-400 font-bold py-3 px-4 rounded-lg cursor-not-allowed" title="Payments are temporarily unavailable">
                                            Unlock Film
                                        </div>
                                     )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                 <div className="sticky bottom-0 bg-gradient-to-t from-[#181818] via-[#181818] to-transparent p-6 text-center">
                    {blockIsUnlocked ? (
                        <div className="bg-green-500/20 border border-green-400 text-green-300 font-bold py-3 px-8 rounded-lg text-lg inline-block">
                             ✓ You have unlocked this entire block
                        </div>
                    ) : (
                         <div className="bg-gray-700 text-gray-400 font-bold py-3 px-8 rounded-lg text-lg inline-block cursor-not-allowed" title="Payments are temporarily unavailable">
                            Unlock Full Block
                        </div>
                    )}
                 </div>

            </div>
        </div>
    );
};

export default FilmBlockDetailsModal;