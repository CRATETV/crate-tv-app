import React, { useMemo } from 'react';
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

const MobileActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode; }> = ({ onClick, title, children }) => (
    <button onClick={onClick} title={title} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
        {children}
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
    const isMobile = useMemo(() => typeof window !== 'undefined' && window.matchMedia("(max-width: 768px)").matches, []);
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    // Simplified Mobile View
    if (isMobile) {
        return (
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-between items-center z-40 p-4 animate-controls-fade-in"
                onClick={onResume}
            >
                {/* Top Spacer */}
                <div />

                {/* Main Playback Controls (Vertically Centered) */}
                <div className="flex items-center justify-center gap-8" onClick={stopPropagation}>
                    <button onClick={onRewind} className="p-3" aria-label="Rewind 10 seconds">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button onClick={onResume} className="transform scale-125" aria-label="Resume playback">
                        <div className="bg-white/10 hover:bg-white/20 rounded-full p-6 transition-all border-2 border-white/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </div>
                    </button>

                     <button onClick={onForward} className="p-3" aria-label="Forward 10 seconds">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
                
                {/* Action Buttons (Bottom) */}
                <div className="w-full flex items-center justify-around" onClick={stopPropagation}>
                    <MobileActionButton onClick={(e) => { e.stopPropagation(); onToggleLike(); }} title={isLiked ? "Unlike" : "Like"}>
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                         </svg>
                     </MobileActionButton>
                     <MobileActionButton onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }} title={isOnWatchlist ? "In My List" : "My List"}>
                        {isOnWatchlist ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        )}
                     </MobileActionButton>
                     {!movie.hasCopyrightMusic && (
                        <MobileActionButton onClick={(e) => { e.stopPropagation(); onSupport(); }} title="Support">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 