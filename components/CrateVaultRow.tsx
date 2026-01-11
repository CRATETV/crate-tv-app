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

            {/* Scanning Laser Animation - Adjusted for periodic frequency */}
            <div className="absolute inset-y-0 left-0 w-[4px] bg-red-600/60 shadow-[0_0_40px_#ef4444] animate-[vaultScan_15s_cubic-bezier(0.4,0,0.2,1)_infinite] pointer-events-none z-20"></div>

            <div className="relative z-10 px-4 md:px-12 py-20">
                {/* Header Unit */}
                <div className="mb-12 pl-6 border-l-[6px] border-red-600 animate-[fadeIn_1s_ease-out]">
                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white italic leading-[0.8] mb-4">
                        The Crate <span className="text-gray-600">Vault.</span>
                    </h2>
                </div>

                <div className="relative group/carousel-container">
                    <div 
                        ref={scrollRef} 
                        className="flex overflow-x-auto space-x-10 pb-12 pt-6 scrollbar-hide snap-x snap-proximity overscroll-x-contain"
                    >
                        {movies.map((movie) => (
                            <div key={movie.key} className="flex-shrink-0 w-[60vw] sm:w-[38vw] md:w-[26vw] lg:w-[20vw] snap-start relative">
                                <div className="relative group/vault-card">
                                    {/* Prestige Pricing Tag - Smaller, ribbon-like, revealed on hover */}
                                    <div className="absolute top-3 right-3 z-[60] opacity-0 translate-y-[-10px] group-hover/vault-card:opacity-100 group-hover/vault-card:translate-y-0 bg-red-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/20 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-75 group-hover/vault-card:scale-100">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                            ${movie.salePrice?.toFixed(2) || '0.00'}
                                        </div>
                                    </div>
                                    
                                    {/* Decorative Tech Brackets that appear on hover */}
                                    <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-red-600/40 opacity-0 group-hover/vault-card:opacity-100 transition-all duration-500"></div>
                                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-red-600/40 opacity-0 group-hover/vault-card:opacity-100 transition-all duration-500"></div>

                                    {/* Ambient Glow */}
                                    <div className="absolute -inset-2 bg-red-600/0 group-hover/vault-card:bg-red-600/10 rounded-3xl transition-all duration-700 blur-2xl"></div>
                                    
                                    <MovieCard
                                        movie={movie}
                                        onSelectMovie={onSelectMovie}
                                        onToggleLike={onToggleLike}
                                        onToggleWatchlist={onToggleWatchlist}
                                        isWatched={watchedMovies.has(movie.key)}
                                        isOnWatchlist={watchlist.has(movie.key)}
                                        isLiked={likedMovies.has(movie.key)}
                                    />
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
                    2% { opacity: 1; }
                    23% { opacity: 1; }
                    25% { transform: translateX(calc(100vw + 200px)); opacity: 0; }
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