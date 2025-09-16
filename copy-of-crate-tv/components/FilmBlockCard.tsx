import React from 'react';
import { Movie } from '../types.ts';

interface FilmBlockCardProps {
    movie: Movie;
    isUnlocked: boolean;
    onWatch: () => void;
    onUnlock: () => void;
}

const FilmBlockCard: React.FC<FilmBlockCardProps> = ({ movie, isUnlocked, onWatch, onUnlock }) => {
    
    const handleActivation = () => {
        if(isUnlocked) {
            onWatch();
        } else {
            onUnlock();
        }
    }
    
    return (
        <div 
            className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 border-2 border-transparent hover:border-red-500 focus-within:border-red-500 transition-all duration-300 outline-none"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === 'Enter') handleActivation() }}
            // For touch devices that don't fire focus on a single tap, a direct onClick is a reliable fallback.
            onClick={handleActivation}
        >
            <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
            />
            {/* The overlay is now visible on hover (for mouse users) and when the card container has focus (for keyboard and touch users) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <h3 className="text-lg font-bold text-white mb-2">{movie.title}</h3>
                {isUnlocked ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onWatch(); }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
                    >
                        Watch Now
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUnlock(); }}
                        className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
                    >
                        Unlock - $5
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilmBlockCard;
