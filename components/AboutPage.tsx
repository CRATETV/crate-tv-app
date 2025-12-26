
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import CollapsibleFooter from './CollapsibleFooter';
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

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!aboutData) {
        return (
            <div className="flex flex-col min-h-screen text-white">
                 <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                 <main className="flex-grow flex items-center justify-center text-center p-4">
                    <p>Could not load page content. Please try again later.</p>
                 </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={false}
                showNavLinks={false}
            />

            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16 text-center animate-fadeInHeroContent">
                        <img
                            src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png"
                            alt="Crate TV Logo"
                            className="mx-auto w-full max-w-md"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    </div>

                    {/* Mission Statement */}
                    <section className="text-center mb-24 animate-fadeInHeroContent">
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] mb-4 text-xs">Our Purpose</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">Our Mission</h1>
                        <p className="text-2xl md:text-4xl text-gray-200 font-medium leading-tight max-w-4xl mx-auto">
                            "{aboutData.missionStatement}"
                        </p>
                    </section>

                    <div className="space-y-24">
                        {/* Our Story */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter border-b-4 border-red-600 pb-2 inline-block">The Crate Story</h2>
                                <div className="text-gray-400 text-lg leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: aboutData.story }}></div>
                            </div>
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl">
                                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Global Infrastructure</h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">
                                    Operating with a decentralized network of servers and curators, Crate TV provides high-bitrate streaming across mobile, web, and television platforms (including Roku). Our infrastructure is built to scale alongside the ambitions of our filmmakers.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white">4K</p>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Mastering</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                                        <p className="text-2xl font-black text-white">70%</p>
                                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Creator Share</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* The Collective Section - REPLACES FOUNDER */}
                        <section>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">The Crate Collective</h2>
                                <p className="text-gray-400 max-w-2xl mx-auto">Crate TV is maintained by a specialized group of cinematic curators, engineers, and community advocates dedicated to independent film.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <TeamCard 
                                    role="Curation Board" 
                                    desc="Our primary curators screen hundreds of hours of content to ensure every film on the platform meets our standard for original storytelling."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                                />
                                <TeamCard 
                                    role="Engineering" 
                                    desc="Managing our full-stack architecture, Roku distribution channels, and secure payment processing systems."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                />
                                <TeamCard 
                                    role="Filmmaker Support" 
                                    desc="The direct bridge between our platform and creators, handling submissions, payouts, and distribution licensing."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                />
                                <TeamCard 
                                    role="Legal & Rights" 
                                    desc="Ensuring all content is protected and that filmmakers retain 100% of their copyright while streaming on our platform."
                                    icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 010.707 0.293l5.414 5.414a1 1 0 010.293 0.707V19a2 2 0 01-2 2z" /></svg>}
                                />
                            </div>
                        </section>

                        {/* What We Believe In */}
                        <section>
                            <h2 className="text-3xl font-black text-white mb-10 text-center uppercase tracking-widest">Our Core Pillars</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                                <div className="bg-gray-800/20 border border-white/5 p-8 rounded-2xl">
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">{aboutData.belief1Title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{aboutData.belief1Body}</p>
                                </div>
                                <div className="bg-gray-800/20 border border-white/5 p-8 rounded-2xl">
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">{aboutData.belief2Title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{aboutData.belief2Body}</p>
                                </div>
                                <div className="bg-gray-800/20 border border-white/5 p-8 rounded-2xl">
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">{aboutData.belief3Title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{aboutData.belief3Body}</p>
                                </div>
                            </div>
                        </section>

                         {/* Call to Action */}
                        <section className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/10">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">Join the Movement</h2>
                            <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg">Whether you're a filmmaker with a story to tell or a film lover searching for something new, you have a home at Crate TV.</p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                                <a href="/submit" onClick={(e) => handleNavigate(e, '/submit')} className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-5 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-xl uppercase tracking-widest text-sm">
                                    Submit Your Film
                                </a>
                                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="bg-white/10 hover:bg-white/20 text-white font-black px-12 py-5 rounded-2xl transition-all border border-white/10 uppercase tracking-widest text-sm">
                                    Start Exploring
                                </a>
                            </div>
                        </section>

                    </div>
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default AboutPage;
