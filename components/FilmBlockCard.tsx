import React from 'react';
import { Movie } from '../types';

interface FilmBlockCardProps {
    movie: Movie;
    isUnlocked: boolean;
    onWatch: () => void;
    onUnlock: () => void;
}

const FilmBlockCard: React.FC<FilmBlockCardProps> = ({ movie, isUnlocked, onWatch, onUnlock }) => {
    return (
        <div 
            onClick={isUnlocked ? onWatch : onUnlock}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 border-2 border-transparent hover:border-purple-500 focus-within:border-purple-500 transition-all duration-300 cursor-pointer"
        >
            <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-2 sm:p-3">
                <h3 className="text-xs sm:text-sm font-bold text-white mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">{movie.title}</h3>
                <div className={`w-full bg-black/30 backdrop-blur-sm rounded-md text-white font-bold py-2 px-3 text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 text-center
                    ${isUnlocked ? 'bg-red-600 group-hover:bg-red-700' : 'bg-white/20 group-hover:bg-white/30'}`}>
                    {isUnlocked ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Watch Now
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Details
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilmBlockCard;