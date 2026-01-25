import React, { useCallback } from 'react';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import SEO from './SEO';

const AboutPage: React.FC = () => {
    const { isLoading } = useFestival();
    
    const handleGoHome = useCallback(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600">
            <SEO 
                title="The Manifesto" 
                description="Discover the mission of Crate TV: A sanctuary for authentic storytelling and independent cinema." 
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-0">
                {/* HERO SECTION: THE HOOK */}
                <section className="relative h-[60vh] md:h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)]"></div>
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>
                    
                    <div className="relative z-10 max-w-5xl space-y-8 animate-[fadeIn_1s_ease-out]">
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] md:text-xs">A Distribution Afterlife</p>
                        <h1 className="text-5xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.85] italic text-white drop-shadow-2xl">
                            Imagination <br/>Unbound.
                        </h1>
                        <div className="space-y-8 max-w-4xl mx-auto pt-6 border-t border-white/5">
                            <p className="text-xl md:text-3xl text-gray-200 font-medium leading-relaxed italic opacity-90">
                                "At Crate TV, we believe no great story should have an expiration date. Our mission is to liberate independent film from the festival circuit, creating a raw, authentic connection between the world's most daring creators and the viewers who seek them."
                            </p>
                        </div>
                    </div>
                </section>

                <div className="max-w-[1400px] mx-auto px-6 md:px-12 space-y-40 pb-40">
                    
                    {/* THE PHILOSOPHY */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic border-l-8 border-red-600 pl-8 leading-none">The Independent <br/>Spirit.</h2>
                                <p className="text-red-500 font-black uppercase tracking-widest text-[10px]">Crate TV // Core Identity</p>
                            </div>
                            <div className="text-gray-400 text-lg md:text-xl leading-relaxed space-y-8 font-medium">
                                <p>We don't believe in algorithms. We believe in <span className="text-white font-bold">vision</span>. In a world of safe, corporate-molded content, Crate TV is the escape hatch. We are the digital record of the cinematic underground—a hub for imagination, raw creativity, and the independent spirit that major platforms have forgotten.</p>
                                <p>This isn't just streaming. It's a movement to protect the "Distribution Afterlife." Every film in our vault was chosen because it has a pulse, a unique voice, and a story that demands to be seen long after the festival lights have gone down.</p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-gradient-to-br from-red-600/20 to-purple-600/20 rounded-[4rem] blur-3xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                            <div className="relative bg-[#0a0a0a] border border-white/10 p-10 md:p-16 rounded-[4rem] shadow-2xl space-y-10">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">The 70/30 Handshake</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></div>
                                        <p className="text-gray-300 text-lg">70% of every ticket, rental, and donation goes <span className="text-white font-bold underline decoration-red-600 decoration-2">directly to the filmmaker</span>.</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700 mt-2"></div>
                                        <p className="text-gray-500 text-lg leading-relaxed">By choosing Crate, you are directly sustaining the artists. We maintain the infrastructure; you provide the fuel for their next masterpiece. No gatekeeping, no hidden fees—just the work.</p>
                                    </div>
                                </div>
                                <div className="pt-10 border-t border-white/5">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Creator-First Economics // V4.0 Stable</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CALL TO ACTION */}
                    <section className="bg-white/5 p-12 md:p-24 rounded-[4rem] border border-white/5 text-center space-y-12 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03)_0%,transparent_70%)]"></div>
                        <div className="relative z-10 space-y-6">
                            <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">Join the Resistance.</h2>
                            <p className="text-xl md:text-3xl text-gray-400 max-w-4xl mx-auto font-medium italic">"Crate TV is the sanctuary for those who crave authenticity. Whether you're behind the lens or in front of the screen, there is a seat for you here."</p>
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row justify-center items-center gap-6 pt-8">
                            <button 
                                onClick={() => window.location.href='/submit'} 
                                className="w-full sm:w-auto bg-white text-black font-black px-16 py-6 rounded-2xl transition-all transform hover:scale-105 shadow-[0_20px_60px_rgba(255,255,255,0.15)] uppercase tracking-widest text-sm"
                            >
                                Submit Your Film
                            </button>
                            <button 
                                onClick={handleGoHome} 
                                className="w-full sm:w-auto bg-transparent border-2 border-red-600 text-red-600 font-black px-16 py-6 rounded-2xl transition-all transform hover:bg-red-600 hover:text-white uppercase tracking-widest text-sm"
                            >
                                Start the Escape
                            </button>
                        </div>
                    </section>
                </div>

                <footer className="py-20 text-center opacity-30">
                     <p className="text-[10px] font-black text-gray-700 uppercase tracking-[1em] mr-[-1em]">AUTHENTICITY_VERIFIED // INDEPENDENT_CORE // 2025_CYCLE</p>
                </footer>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default AboutPage;