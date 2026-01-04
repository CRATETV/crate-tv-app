
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

interface ZinePageProps {
    storyId?: string;
}

const ZINE_THEMES = [
    { name: 'Red', accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.15)' },
    { name: 'Indigo', accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)' },
    { name: 'Green', accent: '#22c55e', glow: 'rgba(34, 197, 94, 0.15)' },
    { name: 'Amber', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)' },
    { name: 'Purple', accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)' }
];

const GENESIS_STORY: EditorialStory = {
    id: 'genesis',
    title: 'THE SCENE HAS A NEW ARCHIVE.',
    subtitle: 'Announcing Crate Zine: The High-Voltage Afterlife for Independent Masterpieces.',
    content: `
        <p>Welcome to the first transmission of <strong>Crate Zine</strong>. We aren't just a newsletter; we are a digital-industrial record of the cinematic underground. A play on the "Crate Scene," this publication is the pulse of everything we are building at Crate TV.</p>
        
        <h3>The Afterlife Infrastructure</h3>
        <p>Too many films die after their festival run. We've built a permanent home for the champions. Our V4 infrastructure merges technical engineering with award-winning artistic pedigree, ensuring your work doesn't just sit on a server—it lives on the big screen via our custom Roku SDK.</p>
        
        <h3>The 70/30 Patronage Loop</h3>
        <p>We are filmmaker-owned. Our model prioritizes the creator, with 70% of support going directly to the artists. Every view, every like, and every tip helps fuel the next generation of authentic stories.</p>
        
        <h3>AI Studio Core</h3>
        <p>Powered by Gemini 3 Pro and Veo 3.1, our Studio Core identifies talent velocity and generates cinematic hype reels to ensure independent voices reach a global audience with the impact they deserve.</p>
        
        <p><strong>This is the scene. This is the Crate. Let's build.</strong></p>
    `,
    heroImage: 'https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg',
    author: 'Editor-in-Chief',
    type: 'SPOTLIGHT',
    publishedAt: { seconds: Date.now() / 1000 }
};

const StoryCard: React.FC<{ story: EditorialStory; themeColor: string }> = ({ story, themeColor }) => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', `/zine/${story.id}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <a 
            href={`/zine/${story.id}`} 
            onClick={handleNavigate}
            className="group block bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-700 shadow-2xl"
            style={{ borderColor: `${themeColor}20` }}
        >
            <div className="aspect-video relative overflow-hidden">
                <img 
                    src={story.heroImage || 'https://via.placeholder.com/800x450'} 
                    alt={story.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                <div className="absolute top-4 left-4">
                    <span className="text-white font-black px-3 py-1 rounded-full text-[8px] uppercase tracking-widest shadow-xl transition-colors duration-700" style={{ backgroundColor: themeColor }}>
                        {story.type}
                    </span>
                </div>
            </div>
            <div className="p-8 space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter transition-colors duration-700 leading-tight group-hover:text-white" style={{ color: themeColor }}>
                    {story.title}
                </h3>
                <p className="text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed">
                    {story.subtitle}
                </p>
                <div className="pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">By {story.author}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-all duration-700" style={{ color: themeColor }}>
                        Open Dispatch <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </span>
                </div>
            </div>
        </a>
    );
};

const ZinePage: React.FC<ZinePageProps> = ({ storyId }) => {
    const { movies } = useFestival();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentThemeIdx, setCurrentThemeIdx] = useState(0);

    // Chromatic Shift Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentThemeIdx(prev => (prev + 1) % ZINE_THEMES.length);
        }, 8000); // Shift every 8 seconds
        return () => clearInterval(interval);
    }, []);

    const theme = ZINE_THEMES[currentThemeIdx];

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const fetchStories = async () => {
            setIsLoading(true);
            try {
                const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                const fetched: EditorialStory[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
                
                // If no stories exist, inject Genesis issue
                if (fetched.length === 0) {
                    fetched.push(GENESIS_STORY);
                }

                setStories(fetched);

                if (storyId) {
                    const found = fetched.find(s => s.id === storyId);
                    setActiveStory(found || null);
                } else {
                    setActiveStory(null);
                }
            } catch (e) {
                console.error("Zine downlink failed", e);
                setStories([GENESIS_STORY]); // Fallback
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
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-white selection:text-black transition-colors duration-1000">
            <SEO 
                title={activeStory ? activeStory.title : "Crate Zine"} 
                description={activeStory ? activeStory.subtitle : "Crate Zine: The Underground Cinematic Culture. News, Interviews, and The Daily Chart."}
                image={activeStory?.heroImage}
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-32 px-4 md:px-12 relative overflow-hidden">
                {/* Chromatic Glow Orbs */}
                <div 
                    className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] pointer-events-none rounded-full transition-all duration-[3000ms]" 
                    style={{ backgroundColor: theme.glow }}
                ></div>
                <div 
                    className="absolute bottom-0 left-0 w-[600px] h-[600px] blur-[150px] pointer-events-none rounded-full transition-all duration-[3000ms]" 
                    style={{ backgroundColor: `${theme.accent}10` }}
                ></div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    {!activeStory ? (
                        <div className="space-y-20">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-20 gap-10">
                                <div className="space-y-4">
                                    <p className="font-black uppercase tracking-[0.6em] text-[10px] transition-colors duration-1000" style={{ color: theme.accent }}>
                                        Issue #001 // Genesis Manifest
                                    </p>
                                    <div className="flex flex-col md:flex-row items-baseline gap-4 md:gap-6">
                                        <h1 className="text-8xl md:text-[12rem] font-black uppercase tracking-tighter leading-none italic italic-text">CRATE</h1>
                                        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-[0.5em] text-gray-800">zine</h2>
                                    </div>
                                    <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                                        The high-voltage archive of the independent film circuit. Curation with technical precision.
                                    </p>
                                </div>
                                
                                {/* Top 10 Link Banner */}
                                <div className="w-full md:w-80 group">
                                    <a 
                                        href="/top-ten" 
                                        onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/top-ten'); window.dispatchEvent(new Event('pushstate')); }}
                                        className="block p-8 rounded-[2.5rem] shadow-2xl transform transition-all duration-1000 group-hover:scale-[1.03] group-hover:rotate-[-2deg]"
                                        style={{ backgroundColor: theme.accent }}
                                    >
                                        <p className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-2 opacity-70">Live Ranking</p>
                                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">THE TOP 10 TODAY</h3>
                                        <div className="mt-6 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">View The Chart</span>
                                            <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            {/* Story Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {stories.map(story => (
                                    <StoryCard key={story.id} story={story} themeColor={theme.accent} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out]">
                            <button 
                                onClick={() => { window.history.pushState({}, '', '/zine'); window.dispatchEvent(new Event('pushstate')); }}
                                className="mb-10 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Pieces
                            </button>

                            <article className="space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest transition-colors duration-1000" style={{ backgroundColor: theme.accent }}>
                                            {activeStory.type}
                                        </span>
                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently Released'}
                                        </span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-tight">{activeStory.subtitle}</p>
                                    <div className="flex items-center gap-4 pt-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center border text-white font-black text-[10px] transition-all duration-1000" style={{ backgroundColor: `${theme.accent}20`, borderColor: `${theme.accent}40`, color: theme.accent }}>C</div>
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">By {activeStory.author}</p>
                                    </div>
                                </div>

                                <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                                    <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                </div>

                                <div 
                                    className="prose prose-invert max-w-none text-gray-300 text-lg md:text-xl leading-relaxed font-medium space-y-6 zine-content-style"
                                    dangerouslySetInnerHTML={{ __html: activeStory.content }}
                                />

                                <div className="pt-16 border-t border-white/5 space-y-8">
                                    {(activeStory.linkedMovieKey || activeStory.linkedBlockId) && (
                                        <div 
                                            className="p-12 rounded-[3.5rem] border flex flex-col md:flex-row items-center justify-between gap-10 transition-all duration-1000"
                                            style={{ backgroundColor: `${theme.accent}05`, borderColor: `${theme.accent}20` }}
                                        >
                                            <div className="space-y-4 text-center md:text-left">
                                                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Ready for the Scene?</h3>
                                                <p className="text-gray-400 text-lg max-w-md">Experience the films that power Crate Zine directly on our streaming infrastructure.</p>
                                            </div>
                                            {activeStory.linkedMovieKey ? (
                                                <button 
                                                    onClick={() => handleSelectMovie(activeStory.linkedMovieKey!)}
                                                    className="text-white font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
                                                    style={{ backgroundColor: theme.accent }}
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
                                    )}
                                    
                                    {/* Direct Chart Access Link */}
                                    <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 opacity-80 hover:opacity-100 transition-opacity">
                                         <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 transition-colors duration-1000" style={{ color: theme.accent }}>Platform Pulse</p>
                                            <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Discover the global leaderboard</h4>
                                         </div>
                                         <button 
                                            onClick={() => window.location.href='/top-ten'}
                                            className="px-8 py-3 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest"
                                         >
                                            The Top 10 Chart
                                         </button>
                                    </div>
                                </div>
                            </article>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
            <style>{`
                .italic-text { font-style: italic; }
                .zine-content-style h3 {
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: -0.02em;
                    color: white;
                    margin-top: 3rem;
                    font-size: 2rem;
                }
                .zine-content-style p {
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </div>
    );
};

export default ZinePage;
