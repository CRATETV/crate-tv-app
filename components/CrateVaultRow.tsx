import React, { useRef } from 'react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface CrateVaultRowProps {
    movies: Movie[];
    onSelectMovie: (movie: Movie) => void;
    likedMovies: Set<string>;
    onToggleLike: (key: string) => void;
    watchlist: Set<string>;
    onToggleWatchlist: (key: string) => void;
    watchedMovies: Set<string>;
}

const CrateVaultRow: React.FC<CrateVaultRowProps> = ({ 
    movies, 
    onSelectMovie, 
    likedMovies, 
    onToggleLike, 
    watchlist, 
    onToggleWatchlist,
    watchedMovies
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="relative my-24 -mx-4 md:-mx-12 overflow-hidden border-y border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)]">
            {/* Elite Background Atmosphere */}
            <div className="absolute inset-0 bg-[#020202]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-black to-red-950/40 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.08]"></div>
            
            {/* Edge Glows */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>

            {/* Scanning Laser Animation - High Intensity */}
            <div className="absolute inset-y-0 left-0 w-[4px] bg-red-600/60 shadow-[0_0_40px_#ef4444] animate-[vaultScan_12s_linear_infinite] pointer-events-none z-20"></div>

            <div className="relative z-10 px-4 md:px-12 py-20">
                {/* Header Unit */}
                <div className="mb-12 pl-6 border-l-[6px] border-red-600 animate-[fadeIn_1s_ease-out]">
                    <div className="flex items-center gap-4 mb-2">
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.8em] drop-shadow-lg leading-none">Premier Selections</p>
                        <div className="h-[2px] flex-grow max-w-[100px] bg-red-600/20"></div>
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white italic leading-[0.8] mb-4">
                        The Crate <span className="text-gray-600">Vault.</span>
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] bg-white/5 px-3 py-1 rounded-lg border border-white/10">SECURE_NODE</span>
                        <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">AUTHENTICITY_VERIFIED // 1080P_MASTERS</span>
                    </div>
                </div>

                <div className="relative group/carousel-container">
                    <div 
                        ref={scrollRef} 
                        className="flex overflow-x-auto space-x-10 pb-12 pt-6 scrollbar-hide snap-x snap-proximity overscroll-x-contain"
                    >
                        {movies.map((movie) => (
                            <div key={movie.key} className="flex-shrink-0 w-[60vw] sm:w-[38vw] md:w-[26vw] lg:w-[20vw] snap-start relative">
                                <div className="relative group/vault-card">
                                    {/* Prestige Pricing Badge - Dynamic from your set prices */}
                                    <div className="absolute -top-4 -right-4 z-[60] bg-white text-black font-black px-5 py-2 rounded-2xl text-[12px] uppercase shadow-[0_15px_40px_rgba(0,0,0,0.6)] border-2 border-red-600/20 transition-all duration-500 group-hover/vault-card:scale-125 group-hover/vault-card:-rotate-6 group-hover/vault-card:bg-red-600 group-hover/vault-card:text-white">
                                        ${movie.salePrice?.toFixed(2) || '0.00'}
                                    </div>
                                    
                                    {/* Decorative Tech Brackets that appear on hover */}
                                    <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-red-600/40 opacity-0 group-hover/vault-card:opacity-100 transition-all duration-500"></div>
                                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-red-600/40 opacity-0 group-hover/vault-card:opacity-100 transition-all duration-500"></div>

                                    {/* Ambient Glow */}
                                    <div className="absolute -inset-2 bg-red-600/0 group-hover/vault-card:bg-red-600/10 rounded-3xl transition-all duration-700 blur-2xl"></div>
                                    
                                    <MovieCard
                                        movie={movie}
                                        onSelectMovie={onSelectMovie}
                                        likedMovies={likedMovies}
                                        onToggleLike={onToggleLike}
                                        watchlist={watchlist}
                                        onToggleWatchlist={onToggleWatchlist}
                                        isWatched={watchedMovies.has(movie.key)}
                                        isOnWatchlist={watchlist.has(movie.key)}
                                        isLiked={likedMovies.has(movie.key)}
                                    />
                                    
                                    {/* Bottom Node Indicator */}
                                    <div className="mt-4 flex items-center justify-between px-2 opacity-0 group-hover/vault-card:opacity-100 transition-opacity duration-500">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Master_Asset // {movie.key.substring(0,8)}</p>
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse"></div>
                                            <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse [animation-delay:200ms]"></div>
                                            <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse [animation-delay:400ms]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Elite Navigation Buttons */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/90 hover:bg-red-600 text-white p-7 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -ml-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                        aria-label="Scroll left"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/90 hover:bg-red-600 text-white p-7 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -mr-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                        aria-label="Scroll right"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes vaultScan {
                    0% { transform: translateX(-200px); opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { transform: translateX(calc(100vw + 200px)); opacity: 0; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .custom-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default CrateVaultRow;