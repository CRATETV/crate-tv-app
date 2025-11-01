import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import Hero from './Hero';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import { Movie, AboutData, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './AuthModal';

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
                            onSelectMovie={() => openAuthModal('login')}
                        />
                    )}
                    
                    <div className="relative z-10 md:-mt-12">
                        {aboutData && (
                            <>
                                <section className="text-center py-12 md:py-16 px-4 bg-[#141414]">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Mission</h1>
                                    <p className="text-xl md:text-2xl text-[#FF2400] italic leading-relaxed max-w-4xl mx-auto">
                                        "{aboutData.missionStatement}"
                                    </p>
                                </section>

                                <section className="py-12 md:py-16 px-4 max-w-4xl mx-auto">
                                    <h2 className="text-3xl font-bold text-white mb-4 border-b-2 border-red-500 pb-2 inline-block">Our Story</h2>
                                    <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: aboutData.story }}></p>
                                </section>

                                <section className="py-12 md:py-16 px-4 bg-black/20">
                                    <div className="max-w-5xl mx-auto">
                                        <h2 className="text-3xl font-bold text-white mb-6 text-center">What We Believe In</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                                <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief1Title}</h3>
                                                <p className="text-gray-400">{aboutData.belief1Body}</p>
                                            </div>
                                            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                                <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief2Title}</h3>
                                                <p className="text-gray-400">{aboutData.belief2Body}</p>
                                            </div>
                                            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                                                <h3 className="text-xl font-bold text-white mb-2">{aboutData.belief3Title}</h3>
                                                <p className="text-gray-400">{aboutData.belief3Body}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="text-center py-16 md:py-20 bg-gray-900">
                                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Watch?</h2>
                                    <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Join now to explore our full library of independent films.</p>
                                    <button onClick={() => openAuthModal('signup')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform hover:scale-105">
                                        Get Started
                                    </button>
                                </section>
                            </>
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
