import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, Movie } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { useFestival } from '../contexts/FestivalContext';
import ZinePuzzle from './ZinePuzzle';
import ZineTrailerPark from './ZineTrailerPark';
import ZineSentiment from './ZineSentiment';
import ZineGameEmoji from './ZineGameEmoji';

interface ZinePageProps {
    storyId?: string;
}

const ZinePage: React.FC<ZinePageProps> = ({ storyId }) => {
    const { movies } = useFestival();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeGame, setActiveGame] = useState<'code' | 'emoji'>('code');

    useEffect(() => {
        const db = getDbInstance();
        const fetchStories = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }
            try {
                const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                const fetched: EditorialStory[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
                setStories(fetched);

                if (storyId) {
                    setActiveStory(fetched.find(s => s.id === storyId) || null);
                } else {
                    setActiveStory(null);
                }
            } catch (e) {
                console.error("Zine query failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId]);

    const handleNavigate = (id: string | null) => {
        const path = id ? `/zine/${id}` : '/zine';
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600 selection:text-white">
            <SEO title={activeStory ? activeStory.title : "Crate Zine // The Pulse"} description="Interactive cinema culture, dispatches, and puzzles." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-32 px-4 md:px-12 relative overflow-hidden">
                {/* Visual Atmosphere */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-red-600/10 blur-[120px] rounded-full animate-pulse"></div>
                    <div className="absolute bottom-[10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-bounce"></div>
                </div>

                <div className="max-w-[1600px] mx-auto relative z-10">
                    {!activeStory ? (
                        <div className="space-y-16">
                            {/* DYNAMIC HEADER */}
                            <header className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-white/10">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                        <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Network Active 📡</span>
                                    </div>
                                    <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none drop-shadow-2xl">
                                        THE <span className="text-red-600">PULSE.</span>
                                    </h1>
                                    <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-xl leading-tight">
                                        Exploration of the Cinematic Underground ⚡ Monthly Puzzles 🧩 & Critical Dispatches 🎬
                                    </p>
                                </div>
                                <ZineSentiment />
                            </header>

                            {/* FEATURED EDITORIAL SECTOR */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">Top Dispatches 🖋️</h2>
                                    <div className="h-px flex-grow bg-white/10"></div>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {stories[0] && (
                                        <div 
                                            onClick={() => handleNavigate(stories[0].id)}
                                            className="lg:col-span-8 group cursor-pointer bg-[#0a0a0a] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl hover:border-red-600/50 transition-all duration-700 h-[500px] relative"
                                        >
                                            <img src={stories[0].heroImage} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-[2000ms]" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                            <div className="absolute bottom-10 left-10 right-10 space-y-4">
                                                <span className="bg-red-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Headline Feature 🔥</span>
                                                <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">{stories[0].title}</h3>
                                                <p className="text-gray-300 text-lg md:text-xl font-medium max-w-2xl line-clamp-2">{stories[0].subtitle}</p>
                                                <button className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 group-hover:text-white transition-colors">Begin Reading →</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="lg:col-span-4 space-y-6">
                                        {stories.slice(1, 3).map(story => (
                                            <div 
                                                key={story.id}
                                                onClick={() => handleNavigate(story.id)}
                                                className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2.5rem] flex gap-6 items-center group cursor-pointer hover:border-white/20 transition-all shadow-xl h-[238px]"
                                            >
                                                <div className="w-1/3 h-full rounded-2xl overflow-hidden flex-shrink-0 bg-gray-900 border border-white/5">
                                                    <img src={story.heroImage} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" alt="" />
                                                </div>
                                                <div className="flex-grow space-y-2">
                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">{story.type} 🎬</span>
                                                    <h4 className="text-xl font-black uppercase tracking-tighter leading-none group-hover:text-red-500 transition-colors">{story.title}</h4>
                                                    <p className="text-gray-500 text-xs font-medium line-clamp-3 leading-relaxed">{story.subtitle}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* IMMERSIVE TRAILER STAGE */}
                            <section className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-12 shadow-2xl space-y-10 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
                                    <h2 className="text-[12rem] font-black italic">TRAILERS</h2>
                                </div>
                                <ZineTrailerPark movies={Object.values(movies).slice(0, 12)} />
                            </section>

                            {/* INTERACTIVE GAMING SECTOR */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-[#0a0a0a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col h-[600px]">
                                    <div className="p-8 border-b border-white/5 flex gap-4">
                                        <button 
                                            onClick={() => setActiveGame('code')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeGame === 'code' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}
                                        >
                                            Codebreaker 🧩
                                        </button>
                                        <button 
                                            onClick={() => setActiveGame('emoji')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeGame === 'emoji' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}
                                        >
                                            Cine-Quiz 🍿
                                        </button>
                                    </div>
                                    <div className="flex-grow p-10 relative overflow-hidden">
                                        {activeGame === 'code' ? <ZinePuzzle /> : <ZineGameEmoji />}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-[#0a0a0a] to-black border border-white/5 rounded-[3.5rem] p-10 shadow-2xl flex flex-col justify-center space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-4xl font-black uppercase tracking-tighter italic">Join the Dispatch.</h3>
                                        <p className="text-gray-400 text-xl font-medium leading-relaxed">Stay synchronized with the latest festivals, exclusive premieres, and behind-the-scenes engineering logs. 📧</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input 
                                            type="email" 
                                            placeholder="NODE_EMAIL@ADDRESS.COM" 
                                            className="flex-grow bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black tracking-widest uppercase focus:border-red-600 transition-all outline-none"
                                        />
                                        <button className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">Uplink 📡</button>
                                    </div>
                                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Global Independent Infrastructure // Sector Z</p>
                                </div>
                            </section>

                            {/* SECONDARY STORIES BOARD */}
                            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stories.slice(3, 11).map(story => (
                                    <div 
                                        key={story.id}
                                        onClick={() => handleNavigate(story.id)}
                                        className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group cursor-pointer hover:border-white/20 transition-all shadow-xl h-full min-h-[300px]"
                                    >
                                        <div className="space-y-4">
                                            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-gray-900 border border-white/5">
                                                <img src={story.heroImage} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform" alt="" />
                                            </div>
                                            <h4 className="text-xl font-black uppercase tracking-tighter group-hover:text-red-500 transition-colors leading-tight">{story.title}</h4>
                                        </div>
                                        <div className="mt-6 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-gray-700">
                                            <span>{story.author}</span>
                                            <span className="group-hover:text-white transition-colors">Dispatch →</span>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        </div>
                    ) : (
                        /* STORY DETAIL VIEW */
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out]">
                            <button 
                                onClick={() => handleNavigate(null)}
                                className="mb-12 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to The Pulse ⚡
                            </button>

                            <article className="space-y-16">
                                <header className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest shadow-lg">
                                            {activeStory.type} 🎬
                                        </span>
                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                            Dispatch ID: {activeStory.id.substring(0,8).toUpperCase()}
                                        </span>
                                    </div>
                                    <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] italic text-white">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-4xl text-gray-400 font-medium leading-tight">{activeStory.subtitle}</p>
                                    <div className="pt-4 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-500/20 text-red-500 font-black text-xl italic">C</div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Authorized Source</p>
                                            <p className="text-sm font-bold text-white uppercase">{activeStory.author}</p>
                                        </div>
                                    </div>
                                </header>

                                <div className="aspect-video rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative">
                                    <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                </div>

                                <div className="space-y-12">
                                    {activeStory.sections?.map((section, idx) => (
                                        <div key={section.id} className="animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${idx * 100}ms` }}>
                                            {section.type === 'header' && <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600 border-l-8 border-white pl-8 mt-20 mb-8">{section.content} ⚡</h3>}
                                            {section.type === 'quote' && <div className="bg-white/5 border-l-8 border-red-600 p-12 text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white my-16 shadow-2xl rounded-r-3xl">"{section.content}"</div>}
                                            {section.type === 'image' && <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl my-14"><img src={section.content} className="w-full h-auto" alt="" /></div>}
                                            {section.type === 'text' && (
                                                <div className="relative">
                                                    {idx === 0 && <span className="float-left text-[11rem] font-black italic leading-[0.7] mr-6 mt-6 text-red-600 drop-shadow-2xl">{section.content.charAt(0)}</span>}
                                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-relaxed">
                                                        {idx === 0 ? section.content.slice(1) : section.content}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <footer className="pt-32 border-t border-white/5">
                                     <div className="bg-gradient-to-br from-red-600/20 via-red-950/20 to-black p-12 md:p-20 rounded-[4rem] border border-red-500/20 flex flex-col lg:flex-row items-center justify-between gap-16 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none">
                                            <h2 className="text-[15rem] font-black italic tracking-tighter">DISPATCH</h2>
                                        </div>
                                        <div className="space-y-6 text-center lg:text-left relative z-10">
                                            <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">THE SCREEN IS <span className="text-red-600">YOURS.</span></h3>
                                            <p className="text-gray-400 text-xl md:text-2xl max-w-xl font-medium leading-relaxed">Join the global patrons of independent masters directly on our infrastructure. 🎬</p>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href='/'}
                                            className="bg-red-600 hover:bg-red-700 text-white font-black px-20 py-8 rounded-[2.5rem] uppercase tracking-[0.2em] text-sm shadow-[0_20px_50px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 relative z-10"
                                        >
                                            ENTER PORTAL ⚡
                                        </button>
                                    </div>
                                </footer>
                            </article>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => window.location.href='/'} />
            <style>{`.italic-text { font-style: italic; }`}</style>
        </div>
    );
};

export default ZinePage;