import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, Movie, ZineSection } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import ZineTrailerPark from './ZineTrailerPark';
import ZineSentiment from './ZineSentiment';

interface ZinePageProps {
    storyId?: string;
}

const ZineStoryCard: React.FC<{ story: EditorialStory; onClick: () => void }> = ({ story, onClick }) => (
    <div 
        onClick={onClick}
        className="group cursor-pointer bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-red-600/30 transition-all duration-500 shadow-2xl flex flex-col h-full"
    >
        <div className="aspect-[16/10] relative overflow-hidden bg-gray-900">
            <img src={story.heroImage} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-40"></div>
            <div className="absolute top-4 left-4">
                <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[8px] uppercase tracking-widest">{story.type}</span>
            </div>
        </div>
        <div className="p-8 space-y-4 flex-grow">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-gray-400 text-sm font-medium line-clamp-3 leading-relaxed">
                {story.subtitle}
            </p>
        </div>
        <div className="p-8 pt-0 border-t border-white/5 flex justify-between items-center mt-auto">
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">By {story.author}</span>
            <span className="text-red-500 text-[9px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Read Dispatch →</span>
        </div>
    </div>
);

const ZinePage: React.FC<ZinePageProps> = ({ storyId }) => {
    const { movies } = useFestival();
    const { authInitialized } = useAuth();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authInitialized) return;

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
                if (storyId) setActiveStory(fetched.find(s => s.id === storyId) || null);
                else setActiveStory(null);
            } catch (e) {
                console.error("Zine Narrative Sync Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId, authInitialized]);

    const handleNavigate = (id: string | null) => {
        const path = id ? `/zine/${id}` : '/zine';
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600">
            <SEO title={activeStory ? activeStory.title : "Crate Zine"} description="Editorial dispatches from the independent cinematic underground." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-32">
                <div className="max-w-[1600px] mx-auto px-4 md:px-12">
                    {!activeStory ? (
                        <div className="space-y-24">
                            <header className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-16 gap-8">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Global Dispatch Active</span>
                                    </div>
                                    <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter italic leading-none italic-text">
                                        CRATE <span className="text-gray-500">ZINE.</span>
                                    </h1>
                                    <p className="text-xl text-gray-400 font-medium max-w-xl leading-relaxed">The authoritative record of independent cinema culture, curation, and the creators who move us.</p>
                                </div>
                                <div className="hidden md:block">
                                    <ZineSentiment />
                                </div>
                            </header>

                            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {stories.map(story => (
                                    <ZineStoryCard key={story.id} story={story} onClick={() => handleNavigate(story.id)} />
                                ))}
                                {stories.length === 0 && (
                                    <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                                        <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Awaiting Primary Dispatches</p>
                                    </div>
                                )}
                            </section>

                            {/* Cinema Stage Spotlight */}
                            <section className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-8 md:p-16 shadow-2xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12">
                                    <h2 className="text-[10rem] font-black italic">PREVIEW</h2>
                                </div>
                                <ZineTrailerPark movies={Object.values(movies).slice(0, 10)} />
                            </section>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out]">
                            <button onClick={() => handleNavigate(null)} className="mb-12 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest group">
                                <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Dispatches
                            </button>

                            <article className="space-y-16">
                                <header className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Dispatch'}</span>
                                    </div>
                                    <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] italic italic-text drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-tight">{activeStory.subtitle}</p>
                                    <div className="pt-6 border-b border-white/10 pb-8 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-black text-xs">C</div>
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">By {activeStory.author}</p>
                                    </div>
                                </header>

                                <div className="space-y-12">
                                    {activeStory.heroImage && (
                                        <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                                            <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}

                                    {(activeStory.sections || []).map((section, idx) => (
                                        <div key={section.id} className="animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${idx * 100}ms` }}>
                                            {section.type === 'header' && <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600 border-l-8 border-white pl-8 mt-16 mb-8">{section.content}</h3>}
                                            {section.type === 'quote' && <div className="bg-white/5 border-l-8 border-red-600 p-12 text-3xl font-black uppercase italic tracking-tight text-white my-12 rounded-r-3xl shadow-xl">"{section.content}"</div>}
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
                            </article>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => handleNavigate(null)} />
            <style>{`.italic-text { font-style: italic; }`}</style>
        </div>
    );
};

export default ZinePage;