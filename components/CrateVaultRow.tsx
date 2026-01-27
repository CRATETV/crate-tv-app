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
        <div className="relative my-4 md:my-6">
            {/* THE GRADIENT PERIMETER */}
            <div className="relative p-[1px] bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 rounded-[2.5rem] shadow-[0_20px_60px_rgba(239,68,68,0.1)] group transition-all duration-700 hover:shadow-[0_40px_100px_rgba(239,68,68,0.15)]">
                
                {/* INTERNAL CONTAINER */}
                <div className="bg-[#020202] rounded-[2.5rem] overflow-hidden p-4 md:p-6 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.02)_0%,transparent_70%)] pointer-events-none"></div>

                    {/* Header Unit */}
                    <div className="relative z-10 mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="pl-4 border-l-[4px] border-red-600 animate-[fadeIn_1s_ease-out]">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.5em] leading-none">Restricted Access</span>
                            </div>
                            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white italic leading-none drop-shadow-2xl">
                                The Crate <span className="text-gray-600">Vault.</span>
                            </h2>
                        </div>
                    </div>

                    <div className="relative group/carousel-container z-10">
                        <div 
                            ref={scrollRef} 
                            className="flex overflow-x-auto space-x-3 md:space-x-5 pb-3 md:pb-4 pt-1 md:pt-2 scrollbar-hide snap-x snap-proximity overscroll-x-contain"
                        >
                            {movies.map((movie) => (
                                <div key={movie.key} className="flex-shrink-0 w-[34vw] sm:w-[24vw] md:w-[18vw] lg:w-[12vw] snap-start relative">
                                    <div className="relative group/vault-card">
                                        <div className="absolute -top-2.5 left-2.5 z-[60] bg-white text-black font-black px-1.5 py-0.5 rounded-lg text-[5px] uppercase tracking-widest shadow-2xl opacity-0 group-hover/vault-card:opacity-100 transition-opacity">
                                            VOD Node
                                        </div>

                                        <div className="absolute top-2 right-2 z-[60] opacity-0 translate-y-[-5px] group-hover/vault-card:opacity-100 group-hover/vault-card:translate-y-0 bg-red-600 text-white font-black px-1.5 py-0.5 rounded-lg text-[7px] uppercase shadow-2xl border border-white/20 transition-all duration-300">
                                            ${movie.salePrice?.toFixed(2) || '5.00'}
                                        </div>
                                        
                                        <MovieCard
                                            movie={movie}
                                            onSelectMovie={onSelectMovie}
                                            onToggleLike={() => onToggleLike(movie.key)}
                                            onToggleWatchlist={() => onToggleWatchlist(movie.key)}
                                            isWatched={watchedMovies.has(movie.key)}
                                            isOnWatchlist={watchlist.has(movie.key)}
                                            isLiked={likedMovies.has(movie.key)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-red-600 text-white p-3 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -ml-4 shadow-2xl active:scale-90"
                            aria-label="Scroll left"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-red-600 text-white p-3 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -mr-4 shadow-2xl active:scale-90"
                            aria-label="Scroll right"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-end items-center text-[6px] font-black text-gray-800 uppercase tracking-[0.4em]">
                        <span>© Studio V4.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrateVaultRow;