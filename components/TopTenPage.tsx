import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import CollapsibleFooter from './CollapsibleFooter';
import { useFestival } from '../contexts/FestivalContext';

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }));
    }, []);

    const topTenMovies = useMemo(() => {
        return Object.values(movies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);
    
    const rankColors = [
      '#FFD700', // Gold
      '#22d3ee', // Cyan
      '#CD7F32', // Bronze
      '#be123c', // Red
      '#3b82f6', // Blue
      '#16a34a', // Green
      '#9333ea', // Purple
      '#f59e0b', // Orange
      '#db2777', // Pink
      '#14b8a6'  // Teal
    ];

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, movieKey: string) => {
        e.preventDefault();
        window.history.pushState({}, '', `/movie/${movieKey}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={false}
            />
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">
                            Top 10 Today
                        </h1>
                        <p className="text-lg text-gray-400">{currentDate}</p>
                    </div>

                    <div className="space-y-4">
                        {topTenMovies.map((movie, index) => {
                            const color = rankColors[index] || '#64748B';
                            return (
                                <a 
                                    key={movie.key} 
                                    href={`/movie/${movie.key}`} 
                                    onClick={(e) => handleNavigate(e, movie.key)}
                                    className="group block relative rounded-lg overflow-hidden transition-shadow duration-300 hover:shadow-2xl"
                                    style={{ '--rank-color': color } as React.CSSProperties}
                                >
                                    <div className="ranked-card-border p-3 bg-gray-900/50">
                                        <div className="flex items-stretch gap-4">
                                            {/* Left side: Rank and Title */}
                                            <div className="flex-1 flex items-center">
                                                <span 
                                                    className="font-black text-7xl md:text-8xl leading-none select-none text-transparent transition-transform duration-300 group-hover:scale-105"
                                                    style={{ WebkitTextStroke: `3px ${color}` }}
                                                >
                                                    {index + 1}
                                                </span>
                                                <div className="ml-6">
                                                    <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Start Watching</p>
                                                    <h2 className="text-xl md:text-3xl font-bold text-white transition-colors duration-300 group-hover:text-[var(--rank-color)]">{movie.title}</h2>
                                                </div>
                                            </div>
                                            {/* Right side: Poster */}
                                            <div className="w-2/5 md:w-1/3 flex-shrink-0">
                                                <div className="aspect-[2/3] rounded-md overflow-hidden shadow-lg">
                                                    <img 
                                                        src={movie.poster} 
                                                        alt={movie.title} 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        onContextMenu={(e) => e.preventDefault()} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
             <BottomNavBar 
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default TopTenPage;
