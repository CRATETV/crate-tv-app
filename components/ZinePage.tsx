import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, ZineSection } from '../types';
import { getDbInstance } from '../services/firebaseClient';

const ZineCard: React.FC<{ story: EditorialStory; isLarge?: boolean; onClick: () => void }> = ({ story, isLarge, onClick }) => (
    <div 
        onClick={onClick}
        className={`group cursor-pointer flex flex-col gap-4 transition-all duration-500 hover:-translate-y-1 ${isLarge ? 'md:col-span-2' : ''}`}
    >
        <div className={`relative overflow-hidden rounded-[2rem] bg-[#0a0a0a] shadow-2xl border border-white/5 aspect-video ${isLarge ? 'md:aspect-auto md:h-[450px]' : ''}`}>
            <img 
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`} 
                className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" 
                alt="" 
                crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
            <div className="absolute top-6 left-6">
                <span className="bg-red-600 text-white font-black uppercase text-[8px] px-3 py-1 rounded-full tracking-[0.2em] shadow-xl">
                    {story.type || 'DISPATCH'}
                </span>
            </div>
        </div>
        <div className="px-2 space-y-2">
            <h3 className={`font-black text-white uppercase tracking-tighter italic leading-none transition-colors group-hover:text-red-500 ${isLarge ? 'text-3xl md:text-5xl' : 'text-2xl'}`}>
                {story.title}
            </h3>
            <p className="text-gray-400 text-sm md:text-base font-medium line-clamp-2 leading-snug">
                {story.subtitle}
            </p>
            <div className="pt-2 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                <span className="text-gray-600 font-bold uppercase text-[9px] tracking-widest">{story.author}</span>
            </div>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('SPOTLIGHT');
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    const filters = ['SPOTLIGHT', 'NEWS', 'INTERVIEW', 'DEEP_DIVE'];

    useEffect(() => {
        const fetchStories = async () => {
            const db = getDbInstance();
            if (!db) {
                setTimeout(fetchStories, 500);
                return;
            }
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
                console.error("Zine Downlink Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId]);

    const filteredStories = useMemo(() => {
        return stories.filter(s => s.type === activeFilter);
    }, [stories, activeFilter]);

    const spotlightHero = useMemo(() => {
        return stories.find(s => s.type === 'SPOTLIGHT') || stories[0];
    }, [stories]);

    const handleNavigate = (id: string | null) => {
        const path = id ? `/zine/${id}` : '/zine';
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubStatus('loading');
        try {
            const res = await fetch('/api/subscribe-newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });
            if (res.ok) {
                setSubStatus('success');
                setEmail('');
            } else {
                setSubStatus('idle');
            }
        } catch (e) { setSubStatus('idle'); }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600">
            <SEO 
                title={activeStory ? activeStory.title : "Crate Zine"} 
                description={activeStory ? activeStory.subtitle : "The official dispatch from independent cinema's distribution afterlife."} 
                image={activeStory?.heroImage}
                type={activeStory ? "article" : "website"}
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pb-32">
                {!activeStory ? (
                    <div className="space-y-0">
                        {/* 1. SPOTLIGHT HERO: THE PRIMARY ENTRY POINT */}
                        {spotlightHero && (
                            <section 
                                onClick={() => handleNavigate(spotlightHero.id)}
                                className="relative w-full h-[80vh] md:h-[85vh] cursor-pointer group overflow-hidden border-b border-white/5"
                            >
                                <img 
                                    src={`/api/proxy-image?url=${encodeURIComponent(spotlightHero.heroImage)}`} 
                                    className="w-full h-full object-cover transition-transform duration-[10000ms] group-hover:scale-110" 
                                    alt="" 
                                    crossOrigin="anonymous"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent"></div>
                                
                                <div className="absolute bottom-20 left-6 md:left-20 max-w-6xl space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></span>
                                        </span>
                                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[11px]">Primary Dispatch Spotlight</p>
                                    </div>
                                    <h2 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] italic drop-shadow-2xl">{spotlightHero.title}</h2>
                                    <p className="text-xl md:text-3xl text-gray-200 font-medium max-w-4xl drop-shadow-xl leading-tight opacity-90">{spotlightHero.subtitle}</p>
                                    <div className="pt-8">
                                        <span className="bg-white text-black font-black px-14 py-5 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl group-hover:scale-105 transition-transform inline-block">Read dispatch</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 2. STICKY FILTER NAVIGATION: REORDERED PER SPEC */}
                        <div className="sticky top-0 z-40 py-6 bg-[#050505]/95 backdrop-blur-3xl border-b border-white/5 flex items-center justify-center gap-6 md:gap-14 overflow-x-auto scrollbar-hide px-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            {filters.map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-black uppercase text-[10px] md:text-xs tracking-[0.4em] transition-all pb-2 border-b-2 ${activeFilter === f ? 'text-red-600 border-red-600' : 'text-gray-600 border-transparent hover:text-white'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* 3. CONTENT GRID: WITH GRADIENT BRANDING */}
                        <div className="max-w-[1800px] mx-auto px-6 md:px-20 pt-24 space-y-32">
                            {/* GRADIENT BRAND HEADER */}
                            <div className="text-center space-y-6">
                                <h1 className="text-7xl md:text-[9rem] font-black uppercase tracking-tighter leading-none italic bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-2xl py-2">
                                    Crate Zine.
                                </h1>
                                <div className="h-px w-24 bg-red-600 mx-auto opacity-50"></div>
                                <p className="text-gray-500 font-black uppercase tracking-[0.8em] text-[10px] md:text-xs">The Digital Record of Independent Cinema</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
                                {filteredStories.length > 0 ? (
                                    filteredStories.map((story, idx) => (
                                        <ZineCard 
                                            key={story.id} 
                                            story={story} 
                                            isLarge={idx % 4 === 0 && activeFilter !== 'SPOTLIGHT'} 
                                            onClick={() => handleNavigate(story.id)} 
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-32 text-center opacity-30 italic">
                                        <p className="text-gray-600 uppercase font-black tracking-[0.5em] text-xs">Scanning digital archives for next {activeFilter} manifest...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. JOIN NEWSLETTER: RAZOR-THIN GRADIENT OUTLINE */}
                        <section className="max-w-4xl mx-auto px-6 pt-40 pb-20">
                            <div className="relative p-[1px] bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 rounded-[3rem] shadow-[0_40px_120px_rgba(239,68,68,0.15)] group transition-all duration-700 hover:shadow-[0_40px_120px_rgba(239,68,68,0.25)]">
                                <div className="bg-[#050505] rounded-[3rem] p-10 md:p-20 text-center space-y-10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] pointer-events-none"></div>
                                    
                                    <div className="relative z-10 space-y-4">
                                        <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-2">Editorial Dispatch</p>
                                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-2xl">Join the fold.</h2>
                                        <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">Exclusive dispatches on new arrivals, festival schedules, and live watch party reveals.</p>
                                    </div>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-8 rounded-[2rem] inline-block px-16 animate-[fadeIn_0.5s_ease-out] shadow-2xl">
                                            <p className="text-green-500 font-black uppercase text-xs tracking-[0.4em]">UPLINK ESTABLISHED ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto pt-4 relative z-10">
                                            <input 
                                                type="email" 
                                                placeholder="ENTER_EMAIL_NODE" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-white/5 border border-white/10 p-5 rounded-2xl text-white text-sm outline-none focus:border-red-600 transition-all font-black uppercase tracking-widest placeholder:text-gray-900 shadow-inner"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-white text-black font-black py-5 px-10 rounded-2xl uppercase text-[11px] tracking-widest shadow-[0_15px_35px_rgba(255,255,255,0.2)] transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-50"
                                            >
                                                {subStatus === 'loading' ? 'Syncing...' : 'Authorize Link'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="animate-[fadeIn_0.6s_ease-out]">
                        {/* ARTICLE VIEW */}
                        <div className="relative w-full h-[50vh] md:h-[65vh] mb-16 overflow-hidden">
                            <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover blur-sm opacity-30 scale-110" alt="" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-6xl mx-auto space-y-10">
                                <button onClick={() => handleNavigate(null)} className="flex items-center gap-4 text-gray-500 hover:text-white transition-colors uppercase font-black text-[11px] tracking-widest group">
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Return to records
                                </button>
                                <div className="space-y-6">
                                    <span className="bg-red-600 text-white font-black px-5 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-2xl">{activeStory.type}</span>
                                    <h1 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.85] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-4xl text-gray-400 font-medium leading-tight max-w-4xl mx-auto">{activeStory.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-8 pt-6 text-gray-500 font-black uppercase text-[11px] tracking-widest">
                                    <span className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                                        By {activeStory.author}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-800"></span>
                                    <span>{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently Released'}</span>
                                </div>
                            </div>
                        </div>

                        <article ref={articleRef} className="max-w-[950px] mx-auto px-6 pb-48">
                            <div className="space-y-20">
                                {activeStory.sections && activeStory.sections.length > 0 ? (
                                    activeStory.sections.map((section, idx) => (
                                        <div key={section.id}>
                                            {section.type === 'header' && <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-red-600 mb-10 leading-none">{section.content}</h3>}
                                            {section.type === 'quote' && <div className="bg-white/5 border-l-[16px] border-white p-12 text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white my-20 rounded-r-[3rem] shadow-2xl leading-[1.1]">"{section.content}"</div>}
                                            {section.type === 'image' && (
                                                <div className="rounded-[3.5rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] my-20 bg-[#0a0a0a]">
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <div className="relative">
                                                    {idx === 0 && section.content && (
                                                        <span className="float-left text-[12rem] md:text-[15rem] font-black italic leading-[0.65] pr-10 mr-8 mt-10 text-red-600 drop-shadow-[0_15px_30px_rgba(239,68,68,0.4)] select-none">
                                                            {section.content.charAt(0)}
                                                        </span>
                                                    )}
                                                    <p className="text-2xl md:text-3xl text-gray-300 font-medium leading-[1.4] tracking-tight">
                                                        {idx === 0 && section.content ? section.content.slice(1) : section.content}
                                                    </p>
                                                    <div className="clear-both"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-2xl text-gray-300 font-medium leading-relaxed tracking-tight whitespace-pre-wrap">
                                            {activeStory.content}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-60 pt-24 border-t border-white/5 text-center flex flex-col items-center gap-14">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-56 opacity-10 invert" alt="" />
                                <div className="space-y-6">
                                    <p className="text-[14px] font-black text-gray-800 uppercase tracking-[2.5em] mr-[-2.5em]">OFFICIAL RECORD</p>
                                    <button onClick={() => handleNavigate(null)} className="bg-white text-black font-black px-16 py-6 rounded-[2rem] uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]">Explore more dispatches</button>
                                </div>
                            </div>
                        </article>
                    </div>
                )}
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => handleNavigate(null)} />
        </div>
    );
};

export default ZinePage;