
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

interface NewsletterPageProps {
    storyId?: string;
}

const StoryCard: React.FC<{ story: EditorialStory }> = ({ story }) => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', `/newsletter/${story.id}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <a 
            href={`/newsletter/${story.id}`} 
            onClick={handleNavigate}
            className="group block bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-red-600/30 transition-all duration-500 shadow-2xl"
        >
            <div className="aspect-video relative overflow-hidden">
                <img 
                    src={story.heroImage || 'https://via.placeholder.com/800x450'} 
                    alt={story.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                <div className="absolute top-4 left-4">
                    <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[8px] uppercase tracking-widest shadow-xl">
                        {story.type}
                    </span>
                </div>
            </div>
            <div className="p-8 space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-red-500 transition-colors leading-tight">
                    {story.title}
                </h3>
                <p className="text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed">
                    {story.subtitle}
                </p>
                <div className="pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">By {story.author}</span>
                    <span className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        Read Story <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </span>
                </div>
            </div>
        </a>
    );
};

const NewsletterPage: React.FC<NewsletterPageProps> = ({ storyId }) => {
    const { movies } = useFestival();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const fetchStories = async () => {
            setIsLoading(true);
            try {
                const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                const fetched: EditorialStory[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
                setStories(fetched);

                if (storyId) {
                    const found = fetched.find(s => s.id === storyId);
                    setActiveStory(found || null);
                } else {
                    setActiveStory(null);
                }
            } catch (e) {
                console.error("Narrative downlink failed", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStories();
    }, [storyId]);

    const handleSelectMovie = (key: string) => {
        window.history.pushState({}, '', `/movie/${key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600">
            <SEO 
                title={activeStory ? activeStory.title : "The Dispatch"} 
                description={activeStory ? activeStory.subtitle : "Crate Newsletter: Cinematic News, Interviews, and Official Selections."}
                image={activeStory?.heroImage}
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-32 px-4 md:px-12 relative">
                {/* Visual Background Flourish */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 blur-[150px] pointer-events-none rounded-full"></div>
                
                <div className="max-w-7xl mx-auto">
                    {!activeStory ? (
                        <div className="space-y-20">
                            {/* Header Section */}
                            <div className="text-center md:text-left border-b border-white/5 pb-20">
                                <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] mb-4">Official Dispatch Feed</p>
                                <div className="flex flex-col md:flex-row items-baseline gap-6">
                                    <h1 className="text-7xl md:text-[10rem] font-black uppercase tracking-tighter leading-none italic italic-text">CRATE.</h1>
                                    <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-[0.3em] text-gray-700">newsletter</h2>
                                </div>
                                <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mt-8 leading-relaxed">
                                    The cinematic pulse of independent distribution. Deep dives into the films that move us and the creators who power them.
                                </p>
                            </div>

                            {/* Story Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {stories.map(story => (
                                    <StoryCard key={story.id} story={story} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out]">
                            <button 
                                onClick={() => { window.history.pushState({}, '', '/newsletter'); window.dispatchEvent(new Event('pushstate')); }}
                                className="mb-10 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Stories
                            </button>

                            <article className="space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest">
                                            {activeStory.type}
                                        </span>
                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently Released'}
                                        </span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-tight">{activeStory.subtitle}</p>
                                    <div className="flex items-center gap-4 pt-4">
                                        <div className="w-10 h-10 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-black text-[10px]">C</div>
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">By {activeStory.author}</p>
                                    </div>
                                </div>

                                <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                                    <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                </div>

                                <div 
                                    className="prose prose-invert max-w-none text-gray-300 text-lg md:text-xl leading-relaxed font-medium space-y-6"
                                    dangerouslySetInnerHTML={{ __html: activeStory.content }}
                                />

                                {(activeStory.linkedMovieKey || activeStory.linkedBlockId) && (
                                    <div className="pt-16 border-t border-white/5">
                                        <div className="bg-gradient-to-br from-red-600/20 to-transparent p-12 rounded-[3.5rem] border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-10">
                                            <div className="space-y-4 text-center md:text-left">
                                                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Ready for the Full Experience?</h3>
                                                <p className="text-gray-400 text-lg max-w-md">Experience the cinema that powers this dispatch directly on the Crate TV Infrastructure.</p>
                                            </div>
                                            {activeStory.linkedMovieKey ? (
                                                <button 
                                                    onClick={() => handleSelectMovie(activeStory.linkedMovieKey!)}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
                                                >
                                                    Watch "{movies[activeStory.linkedMovieKey!]?.title || 'Film'}"
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => window.location.href='/festival'}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
                                                >
                                                    Access Festival Block
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </article>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
            <style>{`.italic-text { font-style: italic; }`}</style>
        </div>
    );
};

export default NewsletterPage;
