import React, { useCallback } from 'react';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';

const AboutPage: React.FC = () => {
    const { isLoading } = useFestival();
    
    const handleGoHome = useCallback(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <button onClick={handleGoHome} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Home
                        </button>
                    </div>

                    <div className="mb-16 text-center animate-fadeInHeroContent">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV Logo" className="mx-auto w-full max-w-md opacity-90" onContextMenu={(e) => e.preventDefault()} />
                    </div>

                    <section className="text-center mb-32 animate-fadeInHeroContent">
                        <p className="text-red-500 font-black uppercase tracking-[0.5em] mb-4 text-[10px]">A Manifesto for the Bold</p>
                        <h1 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tighter uppercase italic leading-[0.85]">Imagination <br/>Unbound.</h1>
                        <p className="text-2xl md:text-4xl text-gray-200 font-medium leading-tight max-w-4xl mx-auto italic opacity-80">"Crate TV is the escape. A hub for the real, the raw, and the stories that refuse to be ignored."</p>
                    </section>

                    <div className="space-y-32">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                            <div className="space-y-8">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic border-l-8 border-red-600 pl-8 leading-none">The Independent <br/>Spirit.</h2>
                                <div className="text-gray-400 text-xl leading-relaxed space-y-6 font-medium">
                                    <p>We built Crate TV because independent cinema needed a permanent home—a place where films don't just disappear after their festival run. We are here to capture the pulse of creativity before it's diluted by the mainstream.</p>
                                    <p>Crate is an archive of authenticity. It’s a space where imagination isn't measured by a budget, but by the depth of the vision. This is where you find the films that were made simply because they had to exist.</p>
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-br from-red-600/20 to-purple-600/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative bg-[#0a0a0a] border border-white/10 p-10 md:p-14 rounded-[3rem] shadow-2xl space-y-8">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Real Stories. Real People.</h3>
                                    <p className="text-gray-400 text-lg leading-relaxed">Crate TV isn't just a platform; it's a bridge. We connect audiences who crave something deeper with creators who are actually doing the work. No corporate filters—just the work, as it was intended to be seen.</p>
                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">70/30 Artist-First Economics</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white/5 p-12 md:p-24 rounded-[4rem] border border-white/5 text-center space-y-12 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03)_0%,transparent_70%)]"></div>
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">Protect the Craft.</h2>
                                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium">By watching here, you are directly sustaining the filmmakers. Your applause and your support go back to the source.</p>
                            </div>
                            <div className="relative z-10 flex flex-col sm:flex-row justify-center items-center gap-6">
                                <button onClick={() => window.location.href='/submit'} className="bg-white text-black font-black px-12 py-5 rounded-2xl transition-all transform hover:scale-105 shadow-2xl uppercase tracking-widest text-sm">Join the Community</button>
                                <button onClick={handleGoHome} className="bg-transparent border border-white/20 hover:text-red-500 hover:border-red-600 text-white font-black px-12 py-5 rounded-2xl transition-all uppercase tracking-widest text-sm">Start the Escape</button>
                            </div>
                        </section>
                    </div>

                    <footer className="py-20 text-center opacity-30">
                         <p className="text-[10px] font-black text-gray-700 uppercase tracking-[1em] mr-[-1em]">AUTHENTICITY_VERIFIED // INDEPENDENT_CORE</p>
                    </footer>
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default AboutPage;