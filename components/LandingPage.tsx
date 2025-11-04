import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import LoadingSpinner from './components/LoadingSpinner';
import { Movie, AboutData, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

const LandingPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [heroIndex, setHeroIndex] = useState(0);
    const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
                setCategories(data.categories);
                setAboutData(data.aboutData);
            } catch (error) {
                console.error("Failed to load data for Landing page:", error);
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
    
    const openAuthModal = (view: 'login' | 'signup') => {
        setInitialAuthView(view);
        setIsAuthModalOpen(true);
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header
                    searchQuery=""
                    onSearch={() => {}}
                    isScrolled={false}
                    onMobileSearchClick={() => {}}
                    showSearch={false}
                    onSignInClick={() => openAuthModal('login')}
                />
                <main className="flex-grow">
                    {heroMovies.length > 0 && (
                        <Hero
                            movies={heroMovies}
                            currentIndex={heroIndex}
                            onSetCurrentIndex={handleSetHeroIndex}
                            onPlayMovie={() => openAuthModal('login')}
                            onMoreInfo={() => openAuthModal('login')}
                        />
                    )}
                    
                    <div className="relative z-10">
                        {aboutData && (
                            <section className="text-center py-20 md:py-24 px-4 bg-gradient-to-b from-[#141414] to-black">
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Our Mission</h1>
                                <p className="text-xl md:text-2xl text-gray-300 italic leading-relaxed max-w-4xl mx-auto mb-10">
                                    "{aboutData.missionStatement}"
                                </p>
                                <button 
                                    onClick={() => openAuthModal('signup')} 
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105 shadow-lg shadow-red-900/50"
                                >
                                    Get Started
                                </button>
                            </section>
                        )}
                    </div>
                </main>
                 <Footer showActorLinks={true} />
            </div>
            {isAuthModalOpen && (
                <AuthModal
                    initialView={initialAuthView}
                    onClose={() => setIsAuthModalOpen(false)}
                />
            )}
        </>
    );
};

export default LandingPage;