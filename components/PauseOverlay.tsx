import React from 'react';
import { Movie, Actor } from '../types';

interface PauseOverlayProps {
    movie: Movie;
    onResume: () => void;
    onExitPlayer: () => void;
    onSelectActor: (actor: Actor) => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ movie, onResume, onExitPlayer, onSelectActor }) => {
    return (
        <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-center items-center z-20 p-4 md:p-8 animate-[fadeIn_0.3s_ease-out]"
            onClick={onResume} // Click anywhere on the overlay to resume
        >
            <div 
                className="w-full max-w-4xl text-white"
                onClick={e => e.stopPropagation()} // Don't resume if clicking on the info box
            >
                {/* Top Section: Title and Synopsis */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{movie.title}</h1>
                    <p className="text-gray-300 max-w-2xl mx-auto line-clamp-3" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                </div>

                {/* Middle Section: Controls */}
                <div className="flex justify-center items-center gap-8 mb-8">
                    <button 
                        onClick={onResume}
                        className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group"
                        aria-label="Resume playback"
                    >
                        <div className="bg-white/20 group-hover:bg-white/30 rounded-full p-4 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="mt-2 text-sm font-semibold">Resume</span>
                    </button>
                    <button 
                        onClick={onExitPlayer}
                        className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group"
                        aria-label="View more details"
                    >
                        <div className="bg-white/20 group-hover:bg-white/30 rounded-full p-4 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="mt-2 text-sm font-semibold">More Details</span>
                    </button>
                </div>

                {/* Bottom Section: Cast */}
                {movie.cast && movie.cast.length > 0 && (
                     <div>
                        <h3 className="text-lg font-bold text-center mb-4">Cast</h3>
                        <div className="flex justify-center gap-4 overflow-x-auto scrollbar-hide pb-2">
                            {movie.cast.slice(0, 5).map(actor => (
                                <div key={actor.name} onClick={() => onSelectActor(actor)} className="text-center cursor-pointer group flex-shrink-0">
                                    <img src={actor.photo} alt={actor.name} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-gray-600 group-hover:border-white transition-colors" />
                                    <p className="mt-2 text-xs md:text-sm text-gray-300 group-hover:text-white transition-colors w-20 md:w-24 truncate">{actor.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PauseOverlay;