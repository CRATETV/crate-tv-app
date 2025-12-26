import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import Hero from './Hero';
import LoadingSpinner from './LoadingSpinner';
import { Movie, AboutData, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './AuthModal';
import CollapsibleFooter from './CollapsibleFooter';
import { isMovieReleased } from '../constants';

const LandingPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [heroIndex, setHeroIndex] = useState(0);
    const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');
    
    // Email Capture State
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');

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
        // Priority 1: Specifically featured films
        const featuredCategory = categories.featured;
        let spotlightMovies: Movie[] = [];
        
        if (featuredCategory?.movieKeys && featuredCategory.movieKeys.length > 0) {
            spotlightMovies = featuredCategory.movieKeys
                .map(key => movies[key])
                .filter((m): m is Movie => !!m && isMovieReleased(m));
        }
        
        // Priority 2: Fallback to most recent releases if featured is empty
        if (spotlightMovies.length === 0) {
            spotlightMovies = (Object.values(movies) as Movie[])
                .filter(m => m && isMovieReleased(m) && !!m.title)
                .sort((a, b) => {
                    const dateA = a.releaseDateTime ? new Date(a.releaseDateTime).getTime() : 0;
                    const dateB = b.releaseDateTime ? new Date(b.releaseDateTime).getTime() : 0;
                    return dateB - dateA;
                })
                .slice(0, 4);
        }
        
        return spotlightMovies;
    }, [movies, categories.featured]);

    useEffect(() => {
        if (heroMovies.length > 1) {
            heroIntervalRef.current = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 12000); 
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

    const handleGetStarted = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        openAuthModal('signup');
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <div className="flex flex-col min-h-screen text-white bg-black">
                <Header
                    searchQuery=""
                    onSearch={() => {}}
                    isScrolled={false}
                    onMobileSearchClick={() => {}}
                    showSearch={false}
                    onSignInClick={() => openAuthModal('login')}
                    showNavLinks={false}
                />
                
                <main className="flex-grow">
                    {/* Hero Cinematic Backdrop */}
                    <div className="relative w-full h-[70vh] md:h-[56.25vw] max-h-[95vh] min-h-[600px] md:min-h-[650px]">
                        {heroMovies.length > 0 && (
                            <Hero
                                movies={heroMovies}
                                currentIndex={heroIndex}
                                onSetCurrentIndex={handleSetHeroIndex}
                                onPlayMovie={() => {}}
                                onMoreInfo={() => {}}
                                hideContent={true} // Pure background mode
                            />
                        )}
                        
                        {/* Landing Content Layer */}
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center">
                            {/* Darkness overlay for text readability */}
                            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
                            
                            <div className="relative z-30 max-w-4xl w-full pt-16">
                                <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] animate-[fadeInHeroContent_0.8s_ease-out] leading-tight">
                                    Unlimited stories from<br className="hidden md:block"/> independent voices.
                                </h2>
                                <p className="text-lg md:text-2xl font-medium mb-12 drop-shadow-[0_2px_8px_rgba(0,0,0,1)] animate-[fadeInHeroContent_1s_ease-out] text-gray-100 px-4">
                                    Watch for free. Support the community.
                                </p>
                                
                                <div className="w-full max-w-3xl mx-auto animate-[fadeInHeroContent_1.2s_ease-out] px-4">
                                    <p className="text-base md:text-xl mb-6 font-normal drop-shadow-md">
                                        Ready to watch? Join for free and start exploring.
                                    </p>
                                    <form onSubmit={handleGetStarted} className="flex flex-col md:flex-row gap-3 items-start justify-center">
                                        <div className="w-full md:flex-grow relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                                placeholder="Email address"
                                                className={`w-full p-4 md:p-5 bg-black/60 backdrop-blur-xl border-2 ${emailError ? 'border-red-500' : 'border-white/20'} rounded-md text-white focus:outline-none focus:border-red-600 transition-all text-lg`}
                                                required
                                            />
                                            {emailError && <p className="absolute left-0 -bottom-7 text-red-500 text-sm font-bold bg-black/40 px-2 rounded">{emailError}</p>}
                                        </div>
                                        <button 
                                            type="submit"
                                            className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-md text-xl md:text-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap shadow-2xl"
                                        >
                                            Join for Free
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Value Props & Missions */}
                    <div className="relative z-10 bg-black">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                        
                        {aboutData && (
                            <section className="py-24 px-4 md:px-12 max-w-7xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                    <div className="space-y-8">
                                        <h3 className="text-3xl md:text-5xl font-black text-white leading-tight">
                                            Curated by artists,<br/> 
                                            <span className="text-red-600">for the visionaries.</span>
                                        </h3>
                                        <p className="text-xl text-gray-400 leading-relaxed italic border-l-4 border-red-600 pl-6">
                                            "{aboutData.missionStatement}"
                                        </p>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-2 bg-gradient-to-r from-red-600/20 to-purple-600/20 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                                        <div className="relative bg-gray-900 border border-white/10 p-10 rounded-xl shadow-2xl">
                                            <h4 className="text-2xl font-bold mb-6 text-white">The Crate Difference</h4>
                                            <ul className="space-y-6 text-gray-300">
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-1 bg-red-600/20 p-1 rounded-full"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                                                    <span className="text-lg">No generic algorithms. Every film is hand-picked for quality and impact.</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-1 bg-red-600/20 p-1 rounded-full"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                                                    <span className="text-lg">Direct support. 70% of every donation goes directly to sustaining the filmmaker's craft.</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-1 bg-red-600/20 p-1 rounded-full"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                                                    <span className="text-lg">Annual Film Festivals. Stream exclusive festival blocks and short film world premieres from anywhere.</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-1 bg-red-600/20 p-1 rounded-full"><svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                                                    <span className="text-lg">Live Community Events. Join synchronized watch parties and discuss films in real-time with a global audience.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                        
                        {/* Features Grid */}
                        <section className="py-24 bg-gradient-to-b from-black to-gray-950">
                             <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                                <div className="group p-8 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                    <div className="w-16 h-16 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <h5 className="text-xl font-bold text-white mb-3">Watch Everywhere</h5>
                                    <p className="text-gray-400 leading-relaxed">Stream on your phone, tablet, laptop, and TV. No subscription fees, no barriers to great cinema.</p>
                                </div>
                                <div className="group p-8 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                    <div className="w-16 h-16 bg-purple-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                    <h5 className="text-xl font-bold text-white mb-3">Creator Profiles</h5>
                                    <p className="text-gray-400 leading-relaxed">Discover the people behind the performance. Professional profiles for independent actors and filmmakers.</p>
                                </div>
                                <div className="group p-8 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                    <div className="w-16 h-16 bg-green-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h5 className="text-xl font-bold text-white mb-3">Community Support</h5>
                                    <p className="text-gray-400 leading-relaxed">Crate is fueled by audience tips. 70% of every donation goes directly to filmmakers to help them continue their craft.</p>
                                </div>
                             </div>
                        </section>
                    </div>
                </main>
                <CollapsibleFooter />
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