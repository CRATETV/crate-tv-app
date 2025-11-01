import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

const TopTenPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        // Set the current date when the component mounts
        setCurrentDate(new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }));

        const loadData = async () => {
            setIsLoading(true);
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
            } catch (error) {
                console.error("Failed to load data for Top Ten page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const topTenMovies = useMemo(() => {
        return Object.values(movies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, movieKey: string) => {
        e.preventDefault();
        window.history.pushState({}, '', `/movie/${movieKey}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#141414] text-white">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={false}
            />
            <main className="flex-grow pt-24 px-4 md:px-12 printable-top-ten">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12 relative py-8 overflow-hidden rounded-lg">
                         <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-red-900/30 to-black/30 opacity-50"></div>
                         <div className="relative z-10">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                Top 10 on Crate TV Today
                            </h1>
                            <p className="text-lg text-gray-400">
                               {currentDate}
                            </p>
                             <button onClick={handlePrint} className="no-print mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md text-sm">
                                Download List
                             </button>
                         </div>
                    </div>

                    <div className="space-y-2">
                        {topTenMovies.map((movie, index) => (
                            <a 
                                key={movie.key} 
                                href={`/movie/${movie.key}`} 
                                onClick={(e) => handleNavigate(e, movie.key)}
                                className="group flex items-center bg-transparent hover:bg-gray-800/60 transition-colors duration-300 rounded-lg p-3"
                            >
                                <div className="flex items-center justify-center w-24 flex-shrink-0">
                                   <span 
                                        className="font-black text-6xl md:text-7xl leading-none select-none text-gray-800 group-hover:text-gray-700 transition-colors duration-300"
                                        style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                                    >
                                        {index + 1}
                                    </span>
                                </div>
                                <div className="relative w-20 h-28 flex-shrink-0 rounded-md overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
                                    <img 
                                        src={movie.poster} 
                                        alt={movie.title} 
                                        className="w-full h-full object-cover" 
                                        onContextMenu={(e) => e.preventDefault()} 
                                    />
                                </div>
                                <div className="flex-grow min-w-0 pl-6">
                                    <h2 className="text-lg md:text-xl font-bold text-white truncate transition-colors duration-300 group-hover:text-red-400">{movie.title}</h2>
                                    <p className="text-sm text-gray-400 truncate">{movie.director}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default TopTenPage;