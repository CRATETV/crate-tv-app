import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './AuthModal';
import CollapsibleFooter from './CollapsibleFooter';
import SEO from './SEO';

const FeatureBlock: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="p-10 rounded-[3rem] border border-white/10 bg-white/5 space-y-6 transition-all hover:scale-[1.02] hover:bg-white/10 shadow-2xl">
        <div className="text-5xl">{icon}</div>
        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">{title}</h3>
        <p className="text-gray-400 text-lg leading-relaxed font-medium">{desc}</p>
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
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
            } catch (error) {
                console.error("Landing Load Fail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const posters = useMemo(() => {
        return Object.values(movies).map(m => m.poster).filter(Boolean).slice(0, 18);
    }, [movies]);

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
                {/* SECTION 1: THE CINEMATIC POSTER WALL */}
                <section className="relative h-[95vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/10">
                    <div className="absolute inset-0 z-0 grid grid-cols-3 md:grid-cols-6 gap-4 opacity-20 scale-110 rotate-[-5deg] pointer-events-none">
                        {posters.concat(posters).map((url, i) => (
                            <div key={i} className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                                <img src={url} className="w-full h-full object-cover grayscale" alt="" />
                            </div>
                        ))}
                    </div>
                    
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-[#050505]"></div>
                    <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12)_0%,transparent_70%)]"></div>

                    <div className="relative z-20 max-w-5xl px-6 text-center space-y-12 animate-[fadeIn_1s_ease-out]">
                        <div className="space-y-4">
                            <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs md:text-sm">Philadelphia Independent Core</p>
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

                {/* SECTION 2: THE LIGHT BREAK (Addressing the 'Too Dark' feedback) */}
                <section className="bg-white py-40 px-6">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-10 order-2 lg:order-1">
                            <div className="space-y-4">
                                <span className="bg-red-600 text-white font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest">Universal Casting</span>
                                <h2 className="text-5xl md:text-[5.5rem] font-black text-black uppercase tracking-tighter leading-[0.9] italic">Watch on your TV.</h2>
                            </div>
                            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed font-medium max-w-xl">
                                Install our native app on the **Roku Channel Store**, or use our built-in **Cast Hub** to beam 4K masters directly to Apple TV, Chromecast, and Smart TVs with one tap.
                            </p>
                            <div className="flex flex-wrap gap-8 pt-4 grayscale opacity-40">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" className="h-12 w-auto" alt="Roku" />
                                <span className="text-black font-black text-2xl border-l-2 border-black/10 pl-8">APPLE TV</span>
                                <span className="text-black font-black text-2xl border-l-2 border-black/10 pl-8">CHROMECAST</span>
                            </div>
                        </div>
                        <div className="relative order-1 lg:order-2">
                            <div className="absolute -inset-20 bg-red-600/10 blur-[120px] rounded-full animate-pulse"></div>
                            <img 
                                src="https://cratetelevision.s3.us-east-1.amazonaws.com/ruko+logo+.webp" 
                                className="relative z-10 w-full max-w-md mx-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.3)] transform hover:rotate-3 transition-transform duration-700" 
                                alt="Roku App" 
                            />
                        </div>
                    </div>
                </section>

                {/* SECTION 3: THE VALUE GRID */}
                <section className="py-40 px-6 max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-24">
                        <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic">Why Crate TV?</h2>
                        <div className="h-2 w-24 bg-red-600 mx-auto rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureBlock 
                            icon="💎" 
                            title="70/30 Patronage" 
                            desc="We bypass the gatekeepers. 70% of every ticket and donation goes directly into the hands of the filmmakers." 
                        />
                        <FeatureBlock 
                            icon="🛰️" 
                            title="Live Events" 
                            desc="Synchronized global watch parties with real-time director talkbacks. Cinema as a communal experience." 
                        />
                        <FeatureBlock 
                            icon="🍿" 
                            title="Crate Zine" 
                            desc="Expert curatorial dispatches and interviews. We don't just stream films; we document the culture." 
                        />
                    </div>
                </section>

                {/* SECTION 4: THE FAQ SECTION (Trust Building) */}
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
                                answer={<p>Browsing the catalog and reading the Zine is completely free. Most films are free to stream, while certain "Live Premieres" or "Vault Masters" require a small one-time ticket or rental fee. You only pay for what you watch—no recurring monthly subscriptions.</p>}
                            />
                            <FaqItem 
                                question="Where can I watch?" 
                                answer={<p>You can watch on any web browser at cratetv.net. We also have a custom app available on the Roku Channel Store for the big-screen experience, and support casting to Apple TV and Chromecast devices.</p>}
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
                        <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter italic leading-none">The work is waiting.</h2>
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