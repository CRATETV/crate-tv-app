
import React from 'react';
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
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) return <LoadingSpinner />;

    if (!aboutData) {
        return <div className="flex items-center justify-center h-screen text-white">Data unavailable.</div>;
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16 text-center animate-fadeInHeroContent">
                        <img
                            src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png"
                            alt="Crate TV Logo"
                            className="mx-auto w-full max-w-md"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                        <p className="text-gray-500 font-black uppercase tracking-[0.8em] text-[10px] mt-4">Est. 2024</p>
                    </div>

                    <section className="text-center mb-24 animate-fadeInHeroContent">
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] mb-4 text-xs">Our Purpose</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">Our Mission</h1>
                        <p className="text-2xl md:text-4xl text-gray-200 font-medium leading-tight max-w-4xl mx-auto">
                            "{aboutData.missionStatement}"
                        </p>
                    </section>

                    <div className="space-y-24">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter border-b-4 border-red-600 pb-2 inline-block">The Crate Story</h2>
                                <div className="text-gray-400 text-lg leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: aboutData.story }}></div>
                            </div>
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl">
                                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Global Infrastructure</h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">
                                    Founded in 2024, Crate TV operates as a high-density media infrastructure. By merging technical engineering with award-winning artistic pedigree, we eliminate the gap between creators and global distribution.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white">Roku</p>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">SDK Optimized</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white">Gemini</p>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">AI Intelligence</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">The Crate Collective</h2>
                                <p className="text-gray-400 max-w-2xl mx-auto">A unique hybrid of engineering expertise and award-winning cinematic pedigree.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <TeamCard 
                                    role="Creative-Technical" 
                                    desc="Led by our founder—an actor and full-stack engineer—we build features that solve actual creator pain points without a translation layer."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                />
                                <TeamCard 
                                    role="Institutional Heritage" 
                                    desc="Direct access to award-winning pipelines through our partnership with Playhouse West Philadelphia and a professional board of jurors."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                />
                                <TeamCard 
                                    role="AI Automation" 
                                    desc="We leverage Gemini to automate distribution logistics, generating social kits and press releases with zero manual overhead."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                />
                                <TeamCard 
                                    role="Global Distribution" 
                                    desc="Full-stack autonomy across Web, Roku, and AWS to deliver high-bitrate global content with maximum operational efficiency."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                                />
                            </div>
                        </section>

                        <section className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/10">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">Join the Movement</h2>
                            <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg">Whether you're a filmmaker with a story to tell or a fan searching for something new, you have a home at Crate TV.</p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                                <a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-5 rounded-2xl transition-all transform hover:scale-105 shadow-xl uppercase tracking-widest text-sm">Submit Your Film</a>
                                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="bg-white/10 hover:bg-white/20 text-white font-black px-12 py-5 rounded-2xl transition-all border border-white/10 uppercase tracking-widest text-sm">Start Exploring</a>
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
