import React from 'react';
import { Movie, Actor } from '../types';

interface ActionButtonProps {
    onClick: (e: React.MouseEvent) => void;
    title: string;
    children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, title, children }) => (
    <button
        onClick={onClick}
        title={title}
        className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group"
    >
        <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-3 transition-colors">
            {children}
        </div>
        <span className="mt-1 text-xs font-semibold">{title}</span>
    </button>
);


interface PauseOverlayProps {
    movie: Movie;
    onMoreDetails: () => void;
    onSelectActor: (actor: Actor) => void;
    onResume: () => void;
    onRewind: () => void;
    onForward: () => void;
    isLiked: boolean;
    onToggleLike: () => void;
    onSupport: () => void;
    isOnWatchlist: boolean;
    onToggleWatchlist: () => void;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ 
    movie, 
    onMoreDetails, 
    onSelectActor, 
    onResume, 
    onRewind,
    onForward,
    isLiked,
    onToggleLike,
    onSupport,
    isOnWatchlist,
    onToggleWatchlist
}) => {

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-center items-center z-40 p-4 sm:p-8 animate-controls-fade-in"
            onClick={onResume}
        >
            <div 
                className="relative w-full max-w-5xl text-white flex flex-col items-center gap-4 md:gap-6"
                onClick={stopPropagation}
            >
                {/* Main Playback Controls */}
                <div className="flex items-center justify-center gap-8 md:gap-16">
                    <button onClick={onRewind} className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group" aria-label="Rewind 10 seconds">
                        <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-3 md:p-4 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </div>
                        <span className="mt-2 text-xs font-semibold">Rewind 10s</span>
                    </button>

                    <button onClick={onResume} className="transform scale-125 mx-4" aria-label="Resume playback">
                        <div className="bg-white/10 hover:bg-white/20 rounded-full p-4 md:p-6 transition-all border-2 border-white/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </div>
                    </button>

                     <button onClick={onForward} className="flex flex-col items-center text-gray-300 hover:text-white transition-colors group" aria-label="Forward 10 seconds">
                        <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-3 md:p-4 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                        <span className="mt-2 text-xs font-semibold">Forward 10s</span>
                    </button>
                </div>
                
                {/* Title and Cast Info */}
                <div className="relative text-center my-4 p-6 bg-black/30 backdrop-blur-sm rounded-lg max-w-3xl w-full animate-[fadeIn_0.5s_ease-out_0.2s] fill-mode-backwards">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{movie.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">Directed by {movie.director}</p>
                    <p className="text-sm text-gray-300 max-w-xl mx-auto line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: movie.synopsis }}></p>
                    
                    {movie.cast && movie.cast.length > 0 && (
                        <div className="text-sm text-gray-300 max-w-xl mx-auto">
                            <span className="font-semibold text-gray-400">Starring:</span>{' '}
                            {movie.cast.slice(0, 4).map((actor, index) => (
                                <React.Fragment key={actor.name}>
                                    <button 
                                        onClick={() => onSelectActor(actor)} 
                                        className="hover:text-white hover:underline transition-colors"
                                    >
                                        {actor.name}
                                    </button>
                                    {index < movie.cast.slice(0, 4).length - 1 && ', '}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-6 md:gap-8">
                     <ActionButton onClick={(e) => { e.stopPropagation(); onToggleLike(); }} title={isLiked ? "Unlike" : "Like"}>
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-inherit'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                         </svg>
                     </ActionButton>
                     <ActionButton onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }} title={isOnWatchlist ? "In My List" : "My List"}>
                        {isOnWatchlist ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        )}
                     </ActionButton>
                     {!movie.hasCopyrightMusic && (
                        <ActionButton onClick={(e) => { e.stopPropagation(); onSupport(); }} title="Support">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                             </svg>
                        </ActionButton>
                     )}
                     <ActionButton onClick={(e) =>