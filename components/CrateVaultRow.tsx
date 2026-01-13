
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
        <div className="relative my-8 md:my-12 -mx-4 md:-mx-12 overflow-hidden border-y border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            {/* Elite Background Atmosphere */}
            <div className="absolute inset-0 bg-[#020202]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/10 via-black to-red-950/10 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            
            {/* Edge Glows */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent"></div>

            <div className="relative z-10 px-4 md:px-12 py-6 md:py-10">
                {/* Header Unit */}
                <div className="mb-6 md:mb-8 pl-4 border-l-4 border-red-600 animate-[fadeIn_1s_ease-out]">
                    <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-white italic leading-none mb-1">
                        The Crate <span className="text-gray-600">Vault.</span>
                    </h2>
                </div>

                <div className="relative group/carousel-container">
                    <div 
                        ref={scrollRef} 
                        className="flex overflow-x-auto space-x-4 md:space-x-6 pb-4 md:pb-8 pt-2 md:pt-4 scrollbar-hide snap-x snap-proximity overscroll-x-contain"
                    >
                        {movies.map((movie) => (
                            <div key={movie.key} className="flex-shrink-0 w-[38vw] sm:w-[28vw] md:w-[22vw] lg:w-[16vw] snap-start relative">
                                <div className="relative group/vault-card">
                                    {/* Prestige Pricing Tag */}
                                    <div className="absolute top-2 right-2 z-[60] opacity-0 translate-y-[-5px] group-hover/vault-card:opacity-100 group-hover/vault-card:translate-y-0 bg-red-600 text-white font-black px-2 py-1 rounded text-[8px] uppercase shadow-2xl border border-white/20 transition-all duration-300">
                                        ${movie.salePrice?.toFixed(2) || '0.00'}
                                    </div>
                                    
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
                        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-red-600 text-white p-5 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -ml-6 shadow-2xl"
                        aria-label="Scroll left"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-red-600 text-white p-5 rounded-full opacity-0 group-hover/carousel-container:opacity-100 transition-all z-30 hidden md:block backdrop-blur-2xl border border-white/10 -mr-6 shadow-2xl"
                        aria-label="Scroll right"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CrateVaultRow;
