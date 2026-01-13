import React, { useMemo, useState, useRef, useEffect } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import TopTenShareableImage from './TopTenShareableImage';
import SEO from './SEO';

const RankCard: React.FC<{ movie: Movie; rank: number; onSelect: (m: Movie) => void; views: number }> = ({ movie, rank, onSelect, views }) => (
    <div 
        onClick={() => onSelect(movie)}
        className="group relative flex items-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-red-600/30 p-4 md:p-8 rounded-[2.5rem] transition-all duration-500 cursor-pointer overflow-hidden animate-[fadeIn_0.5s_ease-out]"
        style={{ animationDelay: `${rank * 100}ms` }}
    >
        <span 
            className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[12rem] md:text-[18rem] leading-none select-none opacity-[0.03] group-hover:opacity-[0.08] transition-opacity italic"
            style={{ WebkitTextStroke: '2px white', color: 'transparent' }}
        >
            {rank}
        </span>

        <div className="relative z-10 flex items-center gap-6 md:gap-12 w-full">
            <div className="flex-shrink-0 flex items-center justify-center w-12 md:w-20">
                {/* Fixed truncated text by providing a rank label */}
                <span className="text-2xl font-black text-white/20 group-hover:text-red-500 transition-colors uppercase tracking-widest">#{rank}</span>
            </div>
            
            <div className="relative w-20 h-28 md:w-32 md:h-44 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-grow min-w-0 space-y-2">
                <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic group-hover:text-red-500 transition-colors truncate leading-tight">
                    {movie.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <p className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Directed by {movie.director}</p>
                    <div className="hidden sm:block h-1 w-1 rounded-full bg-gray-800"></div>
                    <p className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest">
                        {views.toLocaleString()} Global Streams
                    </p>
                </div>
            </div>

            <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                </div>
            </div>
        </div>
    </div>
);

const TopTenPage: React.FC = () => {
    const { movies, analytics, isLoading } = useFestival();
    
    // Sort movies by view counts provided by analytics
    const sortedMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m && !m.isUnlisted && !!m.poster)
            .sort((a, b) => (analytics?.viewCounts?.[b.key] || 0) - (analytics?.viewCounts?.[a.key] || 0))
            .slice(0, 10);
    }, [movies, analytics]);

    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <SEO title="Top 10 Today" description="The most streamed films on Crate TV today based on global audience reach." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            
            <main className="flex-grow pt-24 pb-24 px-4 md:px-12">
                <div className="max-w-5xl mx-auto space-y-16">
                    <div className="text-center md:text-left">
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] mb-4">Live Performance Manifest</p>
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">Sector Priority.</h1>
                        <p className="text-xl text-gray-500 mt-4 font-medium">Tracking global audience velocity in real-time. The definitive chart.</p>
                    </div>

                    <div className="space-y-6">
                        {sortedMovies.map((movie, index) => (
                            <RankCard 
                                key={movie.key} 
                                movie={movie} 
                                rank={index + 1} 
                                views={analytics?.viewCounts?.[movie.key] || 0}
                                onSelect={handleSelectMovie}
                            />
                        ))}
                        
                        {sortedMovies.length === 0 && (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                                <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Awaiting Cluster Synchronization</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }} />
            <style>{`.italic-text { font-style: italic; }`}</style>
        </div>
    );
};

export default TopTenPage;