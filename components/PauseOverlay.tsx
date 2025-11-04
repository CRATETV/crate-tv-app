import React from 'react';
import { Movie, Actor } from '../types';

interface PauseOverlayProps {
    movie: Movie;
    onResume: () => void;
    onExitPlayer: () => void; // This is the "More Details" button
    onSelectActor: (actor: Actor) => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ movie, onResume, onExitPlayer, onSelectActor }) => {
    return (
        <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center z-20 p-4 sm:p-8 animate-[fadeIn_0.3s_ease-out]"
        >
            <div 
                className="w-full max-w-5xl text-white grid grid-cols-1 md:grid-cols-3 gap-8 items-center"
                onClick={e => e.stopPropagation()} // Prevent clicks inside from resuming
            >
                {/* Left Side: Controls */}
                <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-8">
                    <button 
                        onClick={onResume}
                        className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group"
                        aria-label="Resume playback"
                    >
                        <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-4 transition-colors border-2 border-white/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-16 md:w-16 text-white" viewBox="0 0 20 20" fill="currentColor">
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
                        <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-4 transition-colors border-2 border-white/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-16 md:w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="mt-2 text-sm font-semibold">More Details</span>
                    </button>
                </div>

                {/* Right Side: Info Panel */}
                <div className="md:col-span-2 bg-black/40 p-6 rounded-lg max-h-[70vh] overflow-y-auto scrollbar-hide border border-gray-700">
                    <h1 className="text-3xl font-bold mb-4">{movie.title}</h1>
                    
                    <div className="space-y-6">
                        {/* Synopsis Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-400 mb-2 uppercase tracking-wider">Synopsis</h3>
                            <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                        </div>

                        {/* Cast Section */}
                        {movie.cast && movie.cast.length > 0 && (
                             <div>
                                <h3 className="text-lg font-semibold text-gray-400 mb-3 uppercase tracking-wider">Cast</h3>
                                <div className="flex flex-wrap gap-4">
                                    {movie.cast.slice(0, 8).map(actor => (
                                        <div key={actor.name} onClick={() => onSelectActor(actor)} className="text-center cursor-pointer group flex-shrink-0">
                                            <img src={actor.photo} alt={actor.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-600 group-hover:border-white transition-colors" />
                                            <p className="mt-2 text-xs text-gray-300 group-hover:text-white transition-colors w-20 truncate">{actor.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PauseOverlay;