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

interface ZinePageProps {
    storyId?: string;
}

const ZINE_THEMES = [
    { name: 'Red', accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', label: 'SECTOR_01' },
    { name: 'Indigo', accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.2)', label: 'SECTOR_02' },
    { name: 'Green', accent: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)', label: 'SECTOR_03' },
    { name: 'Amber', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)', label: 'SECTOR_04' }
];

const GENESIS_STORY: EditorialStory = {
    id: 'genesis-manifesto',
    title: 'THE AFTERLIFE IS HERE.',
    subtitle: 'Defining the Crate Scene: Why independent cinema finally has a permanent vault.',
    content: '', // Legacy support
    sections: [
        { id: '1', type: 'text', content: 'Welcome to the first transmission of Crate Zine. We aren\'t just a platform; we are a high-voltage media infrastructure designed to act as the permanent record of the independent cinematic underground.' },
        { id: '2', type: 'quote', content: 'THE SCENE HAS AN ARCHIVE. THE CHAMPIONS HAVE A LIFEBOAT.' },
        { id: '3', type: 'header', content: 'The Death of Distribution' },
        { id: '4', type: 'text', content: 'For too long, world-class films have died 12 months after their festival run. They vanish into the digital void, lost to algorithms that favor filler over feeling. Crate TV was built to solve the distribution lifecycle failure. We identify world-class talent at the source and provide an elite distribution afterlife.' },
        { id: '5', type: 'header', content: 'The 70/30 Patronage Loop' },
        { id: '6', type: 'text', content: 'Ownership is the only path to sustainability. Crate is filmmaker-owned and filmmaker-prioritized. 70% of every donation and rental goes directly to the creators, fueling the next generation of authentic narratives. When you watch on Crate, you aren\'t just a viewer—you are a patron of the work.' }
    ],
    heroImage: 'https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg',
    author: 'EDITOR-IN-CHIEF',
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
            className="group block bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-700 shadow-2xl relative"
            style={{ borderColor: `${themeColor}20` }}
        >
            <div className="aspect-video relative overflow-hidden">
                <img 
                    src={story.heroImage || 'https://via.placeholder.com/800x450'} 
                    alt={story.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                    <span className="text-white font-black px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.3em] shadow-2xl transition-colors duration-700" style={{ backgroundColor: themeColor }}>
                        {story.type}
                    </span>
                </div>
            </div>
            <div className="p-10 space-y-4">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter transition-colors duration-700 leading-none group-hover:text-white" style={{ color: themeColor }}>
                    {story.title}
                </h3>
                <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
                    {story.subtitle}
                </p>
                <div className="pt-6 flex items-center justify-between border-t border-white/5">
                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">Auth // {story.author}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-all duration-700" style={{ color: themeColor }}>
                        OPEN DISPATCH <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
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

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentThemeIdx(prev => (prev + 1) % ZINE_THEMES.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const theme = ZINE_THEMES[currentThemeIdx];

    useEffect(() => {
        const db = getDbInstance();
        
        const fetchStories = async () => {
            if (!db) {
                setStories([GENESIS_STORY]);
                setIsLoading(false);
                return;
            }
            try {
                const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                const fetched: EditorialStory[] = [];
                snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
                
                if (!fetched.find(s => s.id === GENESIS_STORY.id)) {
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
                console.error("Zine query failed", e);
                setStories([GENESIS_STORY]);
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
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-white selection:text-black transition-colors duration-1000">
            <SEO 
                title={activeStory ? activeStory.title : "Crate Zine"} 
                description={activeStory ? activeStory.subtitle : "Crate Zine: The Underground Cinematic Culture."}
                image={activeStory?.heroImage}
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-24 md:pb-32 px-4 md:px-12 relative overflow-hidden">
                <div 
                    className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] blur-[200px] pointer-events-none rounded-full transition-all duration-[4000ms] opacity-30" 
                    style={{ backgroundColor: theme.accent }}
                ></div>
                
                <div className="max-w-[1600px] mx-auto relative z-10">
                    {!activeStory ? (
                        <div className="space-y-32">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-white/5 pb-24 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-0.5 w-12 transition-colors duration-1000" style={{ backgroundColor: theme.accent }}></div>
                                        <p className="font-black uppercase tracking-[0.8em] text-[10px] transition-colors duration-1000" style={{ color: theme.accent }}>
                                            {theme.label} // MANIFEST_CORE
                                        </p>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-baseline gap-4 md:gap-8">
                                        <h1 className="text-8xl md:text-[15rem] font-black uppercase tracking-tighter leading-[0.75] italic italic-text">CRATE</h1>
                                        <h2 className="text-4xl md:text-7xl font-bold uppercase tracking-[0.4em] text-gray-800">zine</h2>
                                    </div>
                                    <p className="text-2xl md:text-3xl text-gray-500 font-medium max-w-3xl leading-tight">
                                        The high-voltage archive of the independent film circuit. Digital-industrial news and elite curation.
                                    </p>
                                </div>
                                
                                <div className="w-full md:w-max group">
                                    <a 
                                        href="/top-ten" 
                                        onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/top-ten'); window.dispatchEvent(new Event('pushstate')); }}
                                        className="block p-10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,1)] transform transition-all duration-1000 group-hover:scale-[1.05] group-hover:rotate-[-1deg] border border-white/10"
                                        style={{ backgroundColor: theme.accent }}
                                    >
                                        <p className="text-white font-black uppercase text-[10px] tracking-[0.5em] mb-4 opacity-60">LIVE_RANKING</p>
                                        <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">THE TOP 10 TODAY</h3>
                                        <div className="mt-12 flex items-center justify-between border-t border-black/10 pt-6">
                                            <span className="text-[11px] font-black text-black/40 uppercase tracking-[0.4em]">SYNC SESSION</span>
                                            <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center text-white">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-16">
                                {stories.map(story => (
                                    <StoryCard key={story.id} story={story} themeColor={theme.accent} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto animate-[fadeIn_0.6s_ease-out] pb-20">
                            <button 
                                onClick={() => { window.history.pushState({}, '', '/zine'); window.dispatchEvent(new Event('pushstate')); }}
                                className="mb-16 flex items-center gap-4 text-gray-600 hover:text-white transition-all uppercase font-black text-[10px] tracking-[0.6em] group"
                            >
                                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Transmissions
                            </button>

                            <article className="space-y-20">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-6">
                                        <span className="text-white font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.3em] transition-colors duration-1000 shadow-2xl" style={{ backgroundColor: theme.accent }}>
                                            {activeStory.type}
                                        </span>
                                        <span className="text-[10px] text-gray-700 font-black uppercase tracking-[0.5em]">
                                            ENTRY_DATE // {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '01.01.2025'}
                                        </span>
                                    </div>
                                    <h1 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.8] italic">{activeStory.title}</h1>
                                    <p className="text-3xl md:text-4xl text-gray-500 font-medium leading-tight max-w-3xl">{activeStory.subtitle}</p>
                                    <div className="flex items-center gap-6 pt-8 border-t border-white/5">
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center border text-white font-black text-xs transition-all duration-1000 shadow-2xl" style={{ backgroundColor: `${theme.accent}10`, borderColor: `${theme.accent}30`, color: theme.accent }}>C</div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Authorized Source</p>
                                            <p className="text-sm font-black uppercase tracking-widest text-gray-400 mt-0.5">{activeStory.author}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="aspect-video rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_80px_150px_rgba(0,0,0,1)] relative">
                                    <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                </div>

                                <div className="zine-body space-y-12">
                                    {activeStory.sections ? activeStory.sections.map((section, idx) => {
                                        if (section.type === 'header') return <h3 key={section.id} className="text-4xl font-black uppercase tracking-tighter italic text-white border-l-8 border-red-600 pl-6 mt-20">{section.content}</h3>;
                                        if (section.type === 'quote') return <div key={section.id} className="bg-white/5 border-l-8 border-white p-12 text-3xl font-black uppercase italic tracking-tight text-white my-16 shadow-2xl">"{section.content}"</div>;
                                        if (section.type === 'image') return <div key={section.id} className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl my-12"><img src={section.content} className="w-full h-auto" alt="" /></div>;
                                        return (
                                            <div key={section.id} className="relative">
                                                {idx === 0 && <span className="float-left text-9xl font-black italic leading-[0.7] mr-4 mt-4 text-red-600">{section.content.charAt(0)}</span>}
                                                <p className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed">
                                                    {idx === 0 ? section.content.slice(1) : section.content}
                                                </p>
                                            </div>
                                        );
                                    }) : (
                                        <div 
                                            className="text-gray-400 text-xl md:text-2xl leading-relaxed font-medium space-y-10"
                                            dangerouslySetInnerHTML={{ __html: activeStory.content }}
                                        />
                                    )}
                                </div>

                                <div className="pt-24 border-t border-white/5 space-y-12">
                                    {(activeStory.linkedMovieKey || activeStory.linkedBlockId) && (
                                        <div 
                                            className="p-16 rounded-[4rem] border flex flex-col md:flex-row items-center justify-between gap-12 transition-all duration-1000 shadow-2xl"
                                            style={{ backgroundColor: `${theme.accent}05`, borderColor: `${theme.accent}20` }}
                                        >
                                            <div className="space-y-6 text-center md:text-left">
                                                <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">Ready for the Session?</h3>
                                                <p className="text-gray-500 text-xl max-w-md font-medium">Experience the films that power Crate Zine directly on our infrastructure.</p>
                                            </div>
                                            {activeStory.linkedMovieKey ? (
                                                <button 
                                                    onClick={() => handleSelectMovie(activeStory.linkedMovieKey!)}
                                                    className="text-white font-black px-16 py-7 rounded-[2rem] uppercase tracking-[0.2em] text-sm shadow-[0_25px_60px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                                    style={{ backgroundColor: theme.accent }}
                                                >
                                                    WATCH "{movies[activeStory.linkedMovieKey!]?.title || 'FILM'}"
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => window.location.href='/festival'}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-16 py-7 rounded-[2rem] uppercase tracking-[0.2em] text-sm shadow-[0_25px_60px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                                >
                                                    ENTER FESTIVAL
                                                </button>
                                            )}
                                        </div>
                                    )}
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
            `}</style>
        </div>
    );
};

export default ZinePage;