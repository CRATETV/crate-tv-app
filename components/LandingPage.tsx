import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import MovieCarousel from './MovieCarousel';
import { Movie, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './AuthModal';
import CollapsibleFooter from './CollapsibleFooter';
import SEO from './SEO';

const ReasonCard: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="bg-gradient-to-br from-gray-900 to-[#0c0c1a] border border-white/10 p-10 rounded-[2.5rem] flex flex-col justify-between min-h-[320px] transition-all hover:scale-[1.02] hover:border-red-600/30 shadow-2xl relative overflow-hidden group">
        <div className="space-y-4 relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none italic">{title}</h3>
            <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed">{desc}</p>
        </div>
        <div className="absolute bottom-6 right-6 text-6xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
            {icon}
        </div>
    </div>
);

const FaqItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-8 flex justify-between items-center text-left group"
            >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-red-500 transition-colors">{question}</span>
                <span className={`text-3xl transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 pb-8' : 'max-h-0'}`}>
                <div className="text-gray-400 text-lg md:text-xl leading-relaxed space-y-4">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                if ((data as any).viewCounts) setViewCounts((data as any).viewCounts);
            } catch (error) {
                console.error("Landing Load Fail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // STRICT: Filter out Vintage collection for the "Modern Content Wall"
    const modernPosters = useMemo(() => {
        const vintageKeys = new Set(categories.publicDomainIndie?.movieKeys || []);
        return Object.values(movies)
            .filter(m => !!m.poster && !vintageKeys.has(m.key))
            .map(m => m.poster)
            .slice(0, 24);
    }, [movies, categories]);

    // STRICT: Calculate Top 10 from Modern Collection only
    const topTenMovies = useMemo(() => {
        const vintageKeys = new Set(categories.publicDomainIndie?.movieKeys || []);
        return Object.values(movies)
            .filter(m => !!m.poster && !m.isUnlisted && !vintageKeys.has(m.key))
            .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
            .slice(0, 10);
    }, [movies, viewCounts, categories]);

    const openAuthModal = (view: 'login' | 'signup') => {
        setInitialAuthView(view);
        setIsAuthModalOpen(true);
    };

    const handleNavigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0,0);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600">
            <SEO title="Stream Independent" description="The distribution afterlife for independent cinema. Watch for free, support creators directly." />
            
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
                {/* SECTION 1: THE VIBRANT CONTENT WALL HERO */}
                <section className="relative h-[95vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/10">
                    {/* Full Color Animated Grid (No grayscale) */}
                    <div className="absolute inset-0 z-0 grid grid-cols-3 md:grid-cols-6 gap-4 opacity-30 scale-110 rotate-[-5deg] pointer-events-none animate-slow-pan">
                        {modernPosters.concat(modernPosters).map((url, i) => (
                            <div key={i} className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                                <img src={url} className="w-full h-full object-cover" alt="" />
                            </div>
                        ))}
                    </div>
                    
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]"></div>
                    <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)]"></div>

                    <div className="relative z-20 max-w-5xl px-6 text-center space-y-12 animate-[fadeIn_1s_ease-out]">
                        <div className="space-y-4">
                            <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs md:text-sm">Official Distribution Afterlife</p>
                            <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] italic drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">
                                Cinema <br/><span className="text-red-600">Unbound.</span>
                            </h1>
                        </div>
                        
                        <p className="text-2xl md:text-4xl text-gray-200 font-medium max-w-3xl mx-auto leading-tight tracking-tight">
                            Unlimited independent stories. <br className="hidden md:block"/> Zero subscriptions. Pure cinema.
                        </p>

                        <div className="w-full max-w-2xl mx-auto pt-8">
                            <p className="text-lg text-gray-400 mb-6">Ready to watch? Enter your email to create your free account.</p>
                            <form onSubmit={(e) => { e.preventDefault(); openAuthModal('signup'); }} className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="flex-grow p-6 bg-black/80 backdrop-blur-xl border-2 border-white/10 rounded-2xl text-white text-xl focus:border-red-600 outline-none transition-all shadow-2xl"
                                    required
                                />
                                <button 
                                    type="submit"
                                    className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-12 rounded-2xl text-2xl uppercase tracking-tighter transition-all transform hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(239,68,68,0.4)]"
                                >
                                    Get Started
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: TOP 10 TODAY (Vibrant Ranking) */}
                {topTenMovies.length > 0 && (
                    <section className="py-32 px-4 md:px-12 bg-black">
                        <div className="max-w-[1800px] mx-auto">
                            <MovieCarousel 
                                title={
                                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-8 border-l-8 border-red-600 pl-8">
                                        Top 10 Today
                                    </h2>
                                } 
                                movies={topTenMovies} 
                                onSelectMovie={() => openAuthModal('signup')} 
                                watchedMovies={new Set()} 
                                watchlist={new Set()} 
                                likedMovies={new Set()} 
                                onToggleLike={() => {}} 
                                onToggleWatchlist={() => {}} 
                                onSupportMovie={() => {}} 
                                showRankings={true}
                            />
                        </div>
                    </section>
                )}

                {/* SECTION 3: MORE REASONS TO JOIN (Dark Card Grid) */}
                <section className="py-40 px-6 max-w-[1600px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-white italic">More reasons to join</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ReasonCard 
                            title="Enjoy on your TV" 
                            desc="Install the native Roku app, or use our high-bitrate casting to stream on Apple TV and Chromecast."
                            icon="📺"
                        />
                        <ReasonCard 
                            title="Direct Support" 
                            desc="Bypass the gatekeepers. 70% of every ticket goes directly to the filmmakers."
                            icon="💎"
                        />
                        <ReasonCard 
                            title="Watch Everywhere" 
                            desc="Optimized for mobile, tablet, and desktop. Zero installation required for instant playback."
                            icon="🛰️"
                        />
                        <ReasonCard 
                            title="Crate Zine" 
                            desc="Access deep-dive interviews and curatorial dispatches from the cinematic underground."
                            icon="🍿"
                        />
                    </div>
                </section>

                {/* SECTION 4: THE FAQ SECTION */}
                <section className="py-40 px-6 bg-black border-y border-white/5">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-center mb-20">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                            <FaqItem 
                                question="What is Crate TV?" 
                                answer={<p>Crate TV is a specialized streaming infrastructure for independent cinema. We provide a "Distribution Afterlife" for films, ensuring great stories live on long after the festival circuit.</p>}
                            />
                            <FaqItem 
                                question="How much does it cost?" 
                                answer={<p>Browsing the catalog and reading the Zine is completely free. Most films are free to stream, while certain "Live Premieres" or premium rentals require a small one-time fee. You only pay for what you watch—no monthly subscriptions.</p>}
                            />
                            <FaqItem 
                                question="Where can I watch?" 
                                answer={<p>Watch on any web browser at cratetv.net. We also have a custom app available on the Roku Channel Store for the big-screen experience, and support casting to Apple TV and Chromecast devices.</p>}
                            />
                            <FaqItem 
                                question="How do I submit my film?" 
                                answer={
                                    <div className="space-y-6">
                                        <p>We are always looking for bold new voices. You can submit your work directly through our creator portal.</p>
                                        <button 
                                            onClick={() => handleNavigate('/submit')}
                                            className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest hover:bg-gray-200 transition-all shadow-xl active:scale-95"
                                        >
                                            Submit Your Work
                                        </button>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* SECTION 5: FINAL CALL */}
                <section className="relative py-48 px-6 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)]"></div>
                    <div className="relative z-10 max-w-4xl mx-auto space-y-12">
                        <h2 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter italic leading-none">The work is waiting.</h2>
                        <p className="text-gray-400 text-xl font-medium">Ready to watch? Enter your email to create your free account.</p>
                        <form onSubmit={(e) => { e.preventDefault(); openAuthModal('signup'); }} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                className="flex-grow p-6 bg-white/5 border border-white/10 rounded-2xl text-white text-xl focus:border-red-600 outline-none transition-all"
                                required
                            />
                            <button 
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-12 rounded-2xl text-xl uppercase tracking-tighter transition-all"
                            >
                                Get Started
                            </button>
                        </form>
                    </div>
                </section>
            </main>

            <CollapsibleFooter />
            {isAuthModalOpen && (
                <AuthModal 
                    initialView={initialAuthView} 
                    onClose={() => setIsAuthModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default LandingPage;