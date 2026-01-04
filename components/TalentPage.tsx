
import React from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';

const FeatureCard: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] hover:bg-white/[0.08] transition-all group">
        <div className="text-4xl mb-6 group-hover:scale-110 transition-transform inline-block">{icon}</div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
);

const TalentPage: React.FC = () => {
    const handleNavigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
            <main className="flex-grow pt-24 pb-24 md:pb-0">
                
                {/* Hero Section */}
                <div className="relative h-[60vh] md:h-[70vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-black">
                        <div className="absolute inset-0 bg-[url('https://cratetelevision.s3.us-east-1.amazonaws.com/talent-bg.jpg')] opacity-30 grayscale blur-sm scale-110"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black to-black"></div>
                    </div>
                    <div className="relative z-10 max-w-5xl space-y-6 animate-[fadeIn_1.2s_ease-out]">
                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-xs">Global Talent Infrastructure</p>
                        <h1 className="text-5xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.8] italic text-white drop-shadow-2xl">
                            The Source.
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto leading-tight pt-4">
                            Identifying world-class talent at the origin. Connecting creators with global representation.
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-24 space-y-32">
                    
                    {/* Dual Track Entry */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 p-12 rounded-[3.5rem] space-y-8 shadow-2xl">
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">For Talent</h2>
                            <p className="text-gray-400 text-lg leading-relaxed">Join the directory and leverage our AI-driven toolkit to polish your professional narrative. Your work is showcased in narrative context, not just isolated reels.</p>
                            <button onClick={() => handleNavigate('/actor-signup')} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-all transform active:scale-95 shadow-xl">Register Profile</button>
                        </div>
                        <div className="bg-gradient-to-br from-green-600/10 to-transparent border border-green-500/20 p-12 rounded-[3.5rem] space-y-8 shadow-2xl">
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">For Industry</h2>
                            <p className="text-gray-400 text-lg leading-relaxed">Access our Industry Terminal. View real-time audience retention maps and sentiment analytics to scout talent with proven data-driven velocity.</p>
                            <button onClick={() => handleNavigate('/portal')} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-all transform active:scale-95 shadow-xl">Access Discovery Terminal</button>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon="🛰️" 
                            title="Discovery Score" 
                            desc="We calculate talent velocity using audience sentiment spikes and cross-device retention data, identifying breakout performers early." 
                        />
                        <FeatureCard 
                            icon="🎭" 
                            title="Contextual Reels" 
                            desc="Talent is presented through their full performances in our catalog, allowing agents to vet range and chemistry in high-bitrate masters." 
                        />
                        <FeatureCard 
                            icon="🔒" 
                            title="Direct Proxy" 
                            desc="Our secure communication core allows agents to initiate inquiries without compromising the privacy of unrepresented talent." 
                        />
                    </div>

                    {/* Final CTA */}
                    <div className="text-center py-20 bg-white/5 rounded-[4rem] border border-white/5">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 italic">Ready to engage?</h2>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                            <button onClick={() => handleNavigate('/actors-directory')} className="bg-white text-black font-black px-10 py-4 rounded-xl uppercase text-xs tracking-widest hover:scale-105 transition-all">Browse Directory</button>
                            <button onClick={() => handleNavigate('/contact')} className="bg-transparent border border-white/20 text-gray-400 hover:text-white font-black px-10 py-4 rounded-xl uppercase text-xs tracking-widest transition-all">Support Center</button>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default TalentPage;
