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
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    const filters = ['ALL', 'NEWS', 'INTERVIEW', 'DEEP_DIVE', 'SPOTLIGHT'];

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
        if (activeFilter === 'ALL') return stories;
        return stories.filter(s => s.type === activeFilter);
    }, [stories, activeFilter]);

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

            <main className="flex-grow pt-20 pb-32">
                {!activeStory ? (
                    <div className="space-y-12">
                        {/* THE ZINE FILTER HEADER - AT THE TOP */}
                        <div className="sticky top-16 z-40 py-6 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 flex items-center justify-center gap-4 md:gap-10 overflow-x-auto scrollbar-hide px-6">
                            {filters.map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-black uppercase text-[10px] md:text-xs tracking-[0.3em] transition-all pb-1 border-b-2 ${activeFilter === f ? 'text-red-600 border-red-600' : 'text-gray-600 border-transparent hover:text-white'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* MISSION HEADER */}
                        <div className="max-w-[1800px] mx-auto px-6 md:px-20 pt-8 pb-10 text-center">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_#ef4444]"></span>
                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Official Editorial Record</p>
                                </div>
                                <h1 className="text-6xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.75] italic text-white drop-shadow-2xl">
                                    Crate <span className="text-red-600">Zine.</span>
                                </h1>
                                <p className="text-xl md:text-3xl text-gray-400 font-medium leading-tight max-w-3xl mx-auto mt-8">
                                    Stay up to date on all that's happening on Crate.
                                </p>
                            </div>
                        </div>

                        {/* FEATURED HERO */}
                        {stories.length > 0 && activeFilter === 'ALL' && (
                            <section 
                                onClick={() => handleNavigate(stories[0].id)}
                                className="relative w-full h-[60vh] md:h-[75vh] cursor-pointer group overflow-hidden"
                            >
                                <img 
                                    src={`/api/proxy-image?url=${encodeURIComponent(stories[0].heroImage)}`} 
                                    className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-110" 
                                    alt="" 
                                    crossOrigin="anonymous"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                <div className="absolute bottom-20 left-6 md:left-20 max-w-6xl space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black uppercase text-[10px] px-4 py-1.5 rounded-lg tracking-[0.2em] shadow-2xl">FEATURED DISPATCH</span>
                                    </div>
                                    <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] italic drop-shadow-2xl">{stories[0].title}</h2>
                                    <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-4xl drop-shadow-xl leading-tight">{stories[0].subtitle}</p>
                                    <div className="pt-4">
                                        <span className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl group-hover:scale-105 transition-transform inline-block">Read story</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="max-w-[1800px] mx-auto px-6 md:px-20 space-y-16">
                            {/* DIVERSE GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
                                {filteredStories.length > 0 ? (
                                    filteredStories.slice(activeFilter === 'ALL' && stories.length > 0 ? 1 : 0).map((story, idx) => (
                                        <ZineCard 
                                            key={story.id} 
                                            story={story} 
                                            isLarge={idx % 4 === 0} 
                                            onClick={() => handleNavigate(story.id)} 
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center opacity-30 italic">
                                        <p className="text-gray-500 uppercase font-black tracking-widest">Awaiting next dispatch manifest for this category...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* JOIN NEWSLETTER */}
                        <section className="max-w-7xl mx-auto px-6 pt-20 pb-20">
                            <div className="bg-[#0f0f0f] border border-white/5 p-12 md:p-24 rounded-[4rem] text-center space-y-10 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none"></div>
                                <div className="relative z-10 space-y-6">
                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Zine Subscription Terminal</p>
                                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">Join our newsletter.</h2>
                                    <p className="text-gray-400 text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">Join the list for dispatches on new arrivals, festival schedules, and live watch party reveals.</p>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-8 rounded-3xl inline-block px-16 animate-[fadeIn_0.5s_ease-out]">
                                            <p className="text-green-500 font-black uppercase text-sm tracking-[0.3em]">UPLINK ESTABLISHED ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto pt-10">
                                            <input 
                                                type="email" 
                                                placeholder="ENTER_EMAIL_NODE" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-black/40 border-2 border-white/10 p-6 rounded-[2rem] text-white text-xl outline-none focus:border-red-600 transition-all font-black uppercase placeholder:text-gray-800"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-white text-black font-black py-6 px-14 rounded-[2rem] uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Authorize Link
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
                        <div className="relative w-full h-[50vh] md:h-[60vh] mb-16 overflow-hidden">
                            <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover blur-sm opacity-30 scale-110" alt="" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-6xl mx-auto space-y-8">
                                <button onClick={() => handleNavigate(null)} className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest group">
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Return to records
                                </button>
                                <div className="space-y-4">
                                    <span className="bg-red-600 text-white font-black px-4 py-1 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                    <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-3xl text-gray-400 font-medium leading-tight max-w-4xl mx-auto">{activeStory.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-6 pt-6 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                                    <span>By {activeStory.author}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-800"></span>
                                    <span>{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently Released'}</span>
                                </div>
                            </div>
                        </div>

                        <article ref={articleRef} className="max-w-[900px] mx-auto px-6 pb-48">
                            <div className="space-y-16">
                                {activeStory.sections && activeStory.sections.length > 0 ? (
                                    activeStory.sections.map((section, idx) => (
                                        <div key={section.id}>
                                            {section.type === 'header' && <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600 mb-8 leading-none">{section.content}</h3>}
                                            {section.type === 'quote' && <div className="bg-white/5 border-l-[12px] border-white p-10 text-2xl md:text-4xl font-black uppercase italic tracking-tight text-white my-16 rounded-r-[2rem] shadow-2xl leading-tight">"{section.content}"</div>}
                                            {section.type === 'image' && (
                                                <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] my-16 bg-[#0a0a0a]">
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <div className="relative">
                                                    {idx === 0 && section.content && (
                                                        <span className="float-left text-[10rem] md:text-[12rem] font-black italic leading-[0.6] pr-8 mr-6 mt-8 text-red-600 drop-shadow-2xl select-none">
                                                            {section.content.charAt(0)}
                                                        </span>
                                                    )}
                                                    <p className="text-xl md:text-2xl text-gray-300 font-medium leading-[1.4] tracking-tight">
                                                        {idx === 0 && section.content ? section.content.slice(1) : section.content}
                                                    </p>
                                                    <div className="clear-both"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-xl text-gray-300 font-medium leading-relaxed tracking-tight whitespace-pre-wrap">
                                            {activeStory.content}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-40 pt-20 border-t border-white/5 text-center flex flex-col items-center gap-10">
                                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-48 opacity-20 invert" alt="" />
                                <div className="space-y-4">
                                    <p className="text-[12px] font-black text-gray-800 uppercase tracking-[2em] mr-[-2em]">OFFICIAL RECORD</p>
                                    <button onClick={() => handleNavigate(null)} className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl">Explore more dispatches</button>
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