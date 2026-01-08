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

interface ZinePageProps {
    storyId?: string;
}

const ZinePage: React.FC<ZinePageProps> = ({ storyId }) => {
    const { movies } = useFestival();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600 selection:text-white">
            <SEO title={activeStory ? activeStory.title : "Crate Zine // The Pulse"} description="Interactive cinema culture, dispatches, and puzzles." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-32 px-4 md:px-12 relative overflow-hidden">
                {/* Background Visual Logic */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-red-600/10 blur-[120px] rounded-full animate-pulse"></div>
                    <div className="absolute bottom-[10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-bounce"></div>
                </div>

                <div className="max-w-[1400px] mx-auto relative z-10">
                    {!activeStory ? (
                        <div className="space-y-12">
                            {/* NEW INTERACTIVE HEADER */}
                            <header className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-white/10">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                        <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Live Signal</span>
                                    </div>
                                    <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none drop-shadow-2xl">
                                        The <span className="text-red-600">Pulse.</span>
                                    </h1>
                                    <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-xl">
                                        Interactive Cinematic Culture ⚡ Weekly Puzzles 🧩 & Fresh Dispatches 🎬
                                    </p>
                                </div>
                                <ZineSentiment />
                            </header>

                            {/* BENTO GRID LAYOUT */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(250px,auto)]">
                                {/* FEATURE STORY - LARGE */}
                                {stories[0] && (
                                    <div 
                                        onClick={() => handleNavigate(stories[0].id)}
                                        className="md:col-span-8 md:row-span-2 relative group cursor-pointer bg-[#0a0a0a] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl hover:border-red-600/50 transition-all duration-700"
                                    >
                                        <img src={stories[0].heroImage} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-[2000ms]" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                        <div className="absolute bottom-10 left-10 right-10 space-y-4">
                                            <span className="bg-red-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Headline Feature 🔥</span>
                                            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">{stories[0].title}</h3>
                                            <p className="text-gray-300 text-lg md:text-xl font-medium max-w-2xl line-clamp-2">{stories[0].subtitle}</p>
                                        </div>
                                    </div>
                                )}

                                {/* INTERACTIVE PUZZLE BLOCK */}
                                <div className="md:col-span-4 md:row-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-950/40 rounded-[3rem] border border-indigo-500/20 shadow-2xl overflow-hidden p-8 flex flex-col justify-between group hover:border-indigo-400/50 transition-all">
                                    <ZinePuzzle />
                                </div>

                                {/* TRAILER PARK GRID */}
                                <div className="md:col-span-12 md:row-span-1 bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/5 p-10 shadow-2xl">
                                    <ZineTrailerPark movies={Object.values(movies).slice(0, 8)} />
                                </div>

                                {/* SUB-STORIES */}
                                {stories.slice(1).map((story, i) => (
                                    <div 
                                        key={story.id}
                                        onClick={() => handleNavigate(story.id)}
                                        className={`md:col-span-4 bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between group cursor-pointer hover:border-white/20 transition-all shadow-xl hover:-translate-y-2`}
                                    >
                                        <div className="space-y-4">
                                            <div className="aspect-video rounded-2xl overflow-hidden bg-gray-900 relative">
                                                <img src={story.heroImage} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform" alt="" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                            </div>
                                            <h4 className="text-2xl font-black uppercase tracking-tighter leading-tight group-hover:text-red-500 transition-colors">
                                                {story.title} ⚡
                                            </h4>
                                            <p className="text-gray-500 text-sm font-medium line-clamp-2">{story.subtitle}</p>
                                        </div>
                                        <div className="mt-8 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-700">
                                            <span>Auth // {story.author}</span>
                                            <span className="group-hover:text-white transition-colors">Dispatch Entry →</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* STORY DETAIL VIEW */
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out]">
                            <button 
                                onClick={() => handleNavigate(null)}
                                className="mb-12 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Return to Feed ⚡
                            </button>

                            <article className="space-y-16">
                                <header className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest">
                                            {activeStory.type} 🎬
                                        </span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-tight">{activeStory.subtitle}</p>
                                </header>

                                <div className="aspect-video rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
                                    <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                </div>

                                <div className="space-y-10">
                                    {activeStory.sections?.map((section, idx) => (
                                        <div key={section.id} className="animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${idx * 100}ms` }}>
                                            {section.type === 'header' && <h3 className="text-4xl font-black uppercase tracking-tighter italic text-red-600 border-l-8 border-white pl-6 mt-16">{section.content} ⚡</h3>}
                                            {section.type === 'quote' && <div className="bg-white/5 border-l-8 border-red-600 p-12 text-3xl font-black uppercase italic tracking-tight text-white my-12 shadow-2xl">"{section.content}"</div>}
                                            {section.type === 'image' && <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl my-10"><img src={section.content} className="w-full h-auto" alt="" /></div>}
                                            {section.type === 'text' && (
                                                <div className="relative">
                                                    {idx === 0 && <span className="float-left text-9xl font-black italic leading-[0.7] mr-4 mt-4 text-red-600">{section.content.charAt(0)}</span>}
                                                    <p className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed">
                                                        {idx === 0 ? section.content.slice(1) : section.content}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <footer className="pt-24 border-t border-white/5">
                                     <div className="bg-gradient-to-br from-red-600/10 to-transparent p-12 rounded-[4rem] border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl">
                                        <div className="space-y-4 text-center md:text-left">
                                            <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">Ready for the Stream? 🎬</h3>
                                            <p className="text-gray-400 text-xl max-w-md font-medium">Join the patrons of independent cinema directly on our infrastructure.</p>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href='/'}
                                            className="bg-red-600 hover:bg-red-700 text-white font-black px-16 py-7 rounded-[2rem] uppercase tracking-[0.2em] text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
                                        >
                                            Enter Platform ⚡
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