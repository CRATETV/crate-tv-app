import React, { useCallback } from 'react';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';

const TeamCard: React.FC<{ role: string; desc: string; icon: React.ReactNode }> = ({ role, desc, icon }) => (
    <div className="bg-gray-800/40 border border-white/5 p-8 rounded-2xl hover:bg-gray-800/60 transition-all group">
        <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 border border-red-500/20 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-3">{role}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const AboutPage: React.FC = () => {
    const { isLoading, aboutData } = useFestival();
    
    const handleGoHome = useCallback(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    }, []);

    if (isLoading) return <LoadingSpinner />;

    if (!aboutData) {
        return <div className="flex items-center justify-center h-screen text-white">Data unavailable.</div>;
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
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
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV Logo" className="mx-auto w-full max-w-md" onContextMenu={(e) => e.preventDefault()} />
                    </div>

                    <section className="text-center mb-24 animate-fadeInHeroContent">
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] mb-4 text-xs">AI-First Infrastructure</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter uppercase italic leading-[0.9]">The Distribution Afterlife.</h1>
                        <p className="text-2xl md:text-4xl text-gray-200 font-medium leading-tight max-w-4xl mx-auto italic">"{aboutData.missionStatement}"</p>
                    </section>

                    <div className="space-y-24">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter border-b-4 border-red-600 pb-2 inline-block">The Crate Intelligence</h2>
                                <div className="text-gray-400 text-lg leading-relaxed space-y-4">
                                    <p>Crate TV operates as a high-density media infrastructure powered by <strong>Google Gemini</strong>. We integrate Large Language Models into the core of our curatorial pipeline, automating talent discovery and aesthetic alignment.</p>
                                    <p>By merging technical engineering with award-winning artistic pedigree, we eliminate the gap between creators and global distribution. Our platform uses AI to solve the specific market failure of the "Festival Void"—ensuring that world-class cinema reaches a professional audience on Roku and the web with sub-100ms synchronization.</p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl">
                                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter italic">Strategic Architecture</h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">Built on a serverless cloud foundation, Crate TV scales instantly. Our proprietary AI core handles rights auditing, personalized curatorial dispatches, and real-time audience sentiment analysis.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white italic">AI</p>
                                        <p className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">Gemini 3 Pro</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white italic">Cloud</p>
                                        <p className="text-[10px] uppercase font-bold text-red-500 tracking-widest">Global Network</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/10">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">Join the Movement</h2>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                                <button onClick={() => window.location.href='/submit'} className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-5 rounded-2xl transition-all transform hover:scale-105 shadow-xl uppercase tracking-widest text-sm">Submit Your Film</button>
                                <button onClick={handleGoHome} className="bg-white/10 hover:bg-white text-white font-black px-12 py-5 rounded-2xl transition-all border border-white/10 uppercase tracking-widest text-sm">Start Exploring</button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default AboutPage;