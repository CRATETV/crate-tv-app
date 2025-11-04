
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Category, FestivalConfig } from '../types';
import MovieCard from './MovieCard';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';

const ClassicsPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [isFestivalLive, setIsFestivalLive] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
                setCategories(data.categories);
                setFestivalConfig(data.festivalConfig);
            } catch (error) {
                console.error("Failed to load data for Classics page:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        const checkStatus = () => {
            if (!festivalConfig?.startDate || !festivalConfig?.endDate) {
                setIsFestivalLive(false);
                return;
            }
            const now = new Date();
            const start = new Date(festivalConfig.startDate);
            const end = new Date(festivalConfig.endDate);
            const isLive = now >= start && now < end;
            setIsFestivalLive(isLive);
        };
        checkStatus();
        const interval = setInterval(checkStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [festivalConfig]);

    const classicMovies = useMemo(() => {
        const classicsCategory = categories.publicDomainIndie;
        if (!classicsCategory) return [];
        return classicsCategory.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, categories]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={true}
                showNavLinks={true}
            />

            <main className="flex-grow pb-24 md:pb-0">
                {/* Hero Section */}
                <div 
                    className="relative py-24 md:py-32 bg-cover bg-center"
                    style={{ backgroundImage: `url('https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp')` }}
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    <div className="relative z-10 max-w-4xl mx-auto text-center px-4 animate-fadeInHeroContent">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>The Dawn of Cinema</h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                           Journey back to the beginning of film with our curated collection of silent masterpieces and avant-garde classics from the public domain.
                        </p>
                    </div>
                </div>

                {/* Movie Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
                    {classicMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {classicMovies.map(movie => (
                                <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-16">No classic films are available at this time.</p>
                    )}
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                isFestivalLive={isFestivalLive}
                onSearchClick={() => {
                    // Navigate home for search, as this page doesn't have the search overlay
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default ClassicsPage;