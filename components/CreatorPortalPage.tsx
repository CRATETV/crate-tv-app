
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import Hero from './Hero';
import LoadingSpinner from './LoadingSpinner';
import CollapsibleFooter from './CollapsibleFooter';
import { Movie, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';

const CreatorPortalPage: React.FC = () => {
    const [activeView, setActiveView] = useState<'filmmaker' | 'actor'>('filmmaker');
    
    // State for Hero component
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [heroIndex, setHeroIndex] = useState(0);
    const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
                setCategories(data.categories);
            } catch (error) {
                console.error("Failed to load data for Creator Portal page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);
    
    const heroMovies = useMemo(() => {
        if (!categories.featured?.movieKeys) return [];
        return categories.featured.movieKeys.map(key => movies[key]).filter(Boolean);
    }, [movies, categories.featured]);

    useEffect(() => {
        if (heroMovies.length > 1) {
            heroIntervalRef.current = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 7000);
        }
        return () => {
            if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
        };
    }, [heroMovies.length]);

    const handleSetHeroIndex = (index: number) => {
        setHeroIndex(index);
        if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };
    
    const handleHeroAction = () => {
        const path = activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup';
        window.history.pushState({}, '', path);
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
                showSearch={false}
            />
            <main className="flex-grow">
                <div className="relative">
                    <Hero
                        movies={heroMovies}
                        currentIndex={heroIndex}
                        onSetCurrentIndex={handleSetHeroIndex}
                        onPlayMovie={handleHeroAction}
                        onMoreInfo={handleHeroAction}
                    />
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                        <div className="max-w-md w-full text-center">
                            <div className="bg-black/70 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
                                {/* Toggle Switch */}
                                <div className="flex p-2 bg-gray-800/50">
                                    <button 
                                        onClick={() => setActiveView('filmmaker')}
                                        className={`flex-1 py-3 text-lg font-bold transition-colors duration-300 rounded-lg ${activeView === 'filmmaker' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                    >
                                        Filmmaker
                                    </button>
                                    <button 
                                        onClick={() => setActiveView('actor')}
                                        className={`flex-1 py-3 text-lg font-bold transition-colors duration-300 rounded-lg ${activeView === 'actor' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                    >
                                        Actor
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8">
                                    {activeView === 'filmmaker' ? (
                                        <div className="animate-[fadeIn_0.5s_ease-out]">
                                            <h2 className="text-3xl font-bold text-white mb-4">Filmmaker Dashboard</h2>
                                            <p className="text-gray-300 mb-8">
                                                Access performance analytics, track revenue, and manage payouts.
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                <a 
                                                    href="/filmmaker-signup" 
                                                    onClick={(e) => handleNavigate(e, '/filmmaker-signup')}
                                                    className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                                >
                                                    Request Access
                                                </a>
                                                <a 
                                                    href="/login?redirect=/filmmaker-dashboard" 
                                                    onClick={(e) => handleNavigate(e, '/login?redirect=/filmmaker-dashboard')}
                                                    className="flex-1 text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                                >
                                                    Login
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-[fadeIn_0.5s_ease-out]">
                                            <h2 className="text-3xl font-bold text-white mb-4">Actor Portal</h2>
                                            <p className="text-gray-300 mb-8">
                                                Update your public profile, and connect with other actors in the Green Room.
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                <a 
                                                    href="/actor-signup" 
                                                    onClick={(e) => handleNavigate(e, '/actor-signup')}
                                                    className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                                >
                                                    Request Access
                                                </a>
                                                <a 
                                                    href="/login?redirect=/actor-portal" 
                                                    onClick={(e) => handleNavigate(e, '/login?redirect=/actor-portal')}
                                                    className="flex-1 text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                                >
                                                    Login
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
        </div>
    );
};

export default CreatorPortalPage;