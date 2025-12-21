
import React, { useMemo } from 'react';
import { Movie, Actor } from '../types';

interface ActionButtonProps {
    onClick: (e: React.MouseEvent) => void;
    title: string;
    children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, title, children }) => (
    <button
        type="button"
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
    <button type="button" onClick={onClick} title={title} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
        {children}
    </button>
);

interface CastCardProps {
    actor: Actor;
    onClick: (actor: Actor) => void;
}

const CastCard: React.FC<CastCardProps> = ({ actor, onClick }) => (
    <button 
        type="button"
        onClick={(e) => { 
            e.stopPropagation(); 
            onClick(actor); 
        }}
        className="flex flex-col items-center min-w-[100px] group transition-all transform hover:scale-110 active:scale-95 cursor-pointer relative z-50"
    >
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-red-500 transition-colors mb-2 shadow-lg ring-offset-2 ring-offset-black group-hover:ring-2 ring-red-500/50">
            <img 
                src={actor.photo || 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png'} 
                alt={actor.name} 
                className="w-full h-full object-cover pointer-events-none"
            />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-white text-center line-clamp-1 group-hover:text-red-400 drop-shadow-md">
            {actor.name}
        </span>
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
    onHome: () => void;
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
    onToggleWatchlist,
    onHome
}) => {
    const isMobile = useMemo(() => typeof window !== 'undefined' && window.matchMedia("(max-width: 768px)").matches, []);
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-between items-center z-40 p-4 animate-controls-fade-in"
            onClick={onResume}
        >
            {/* Top Section: Navigation and Info */}
            <div className="w-full flex justify-between items-start" onClick={stopPropagation}>
                 <button 
                    onClick={onHome} 
                    className="flex items-center gap-2 text-white bg-black/60 hover:bg-black/80 px-4 py-2 rounded-full backdrop-blur-md transition-colors border border-white/20 z-50 shadow-xl"
                    aria-label="Back to Home"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="text-sm font-bold">Home</span>
                </button>

                <div className="text-right hidden md:block">
                    <h1 className="text-3xl font-black text-white">{movie.title}</h1>
                    <p className="text-gray-400 text-sm">Directed by {movie.director}</p>
                </div>
            </div>

            {/* Center Section: Playback Controls */}
            <div className="flex flex-col items-center justify-center w-full" onClick={stopPropagation}>
                <div className="flex items-center justify-center gap-8 md:gap-16">
                    <button onClick={onRewind} className="p-3 hover:scale-110 transition-transform text-white/80 hover:text-white" aria-label="Rewind 10 seconds">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-14 md:w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button onClick={onResume} className="transform hover:scale-110 transition-transform" aria-label="Resume playback">
                        <div className="bg-white/10 hover:bg-white/20 rounded-full p-5 md:p-8 border-2 border-white/30 shadow-2xl">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-20 md:w-20 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </div>
                    </button>

                     <button onClick={onForward} className="p-3 hover:scale-110 transition-transform text-white/80 hover:text-white" aria-label="Forward 10 seconds">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-14 md:w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
            
            {/* Bottom Section: Interaction and Cast */}
            <div className="w-full flex flex-col items-center gap-6" onClick={stopPropagation}>
                
                {/* Cast Bar (X-Ray Feature) */}
                {movie.cast && movie.cast.length > 0 && (
                    <div className="w-full max-w-4xl animate-[fadeIn_0.6s_ease-out]" onClick={stopPropagation}>
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-500 mb-3 ml-4">Featured Cast</p>
                        <div className="flex items-start gap-6 overflow-x-auto scrollbar-hide px-4 pb-2">
                            {movie.cast.map((actor, idx) => (
                                <CastCard key={idx} actor={actor} onClick={onSelectActor} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Primary Actions */}
                <div className="w-full flex items-center justify-around md:justify-center md:gap-12 pb-4">
                    {isMobile ? (
                        <>
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
                                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                                    </svg>
                                </MobileActionButton>
                            )}
                            <MobileActionButton onClick={(e) => { e.stopPropagation(); onMoreDetails(); }} title="More Info">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </MobileActionButton>
                        </>
                    ) : (
                        <>
                            <ActionButton onClick={(e) => { e.stopPropagation(); onToggleLike(); }} title={isLiked ? "Unlike" : "Like"}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </ActionButton>
                            <ActionButton onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }} title={isOnWatchlist ? "In My List" : "My List"}>
                            {isOnWatchlist ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            )}
                            </ActionButton>
                            {!movie.hasCopyrightMusic && (
                                <ActionButton onClick={(e) => { e.stopPropagation(); onSupport(); }} title="Support">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" />
                                    </svg>
                                </ActionButton>
                            )}
                            <ActionButton onClick={(e) => { e.stopPropagation(); onMoreDetails(); }} title="More Info">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </ActionButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PauseOverlay;
