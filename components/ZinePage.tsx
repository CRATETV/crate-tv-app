
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, ZineSection } from '../types';
import { useFestival } from '../contexts/FestivalContext';

const ZineCard: React.FC<{ story: EditorialStory; onClick: () => void }> = ({ story, onClick }) => (
    <div 
        onClick={onClick}
        className="group cursor-pointer flex flex-col gap-6 transition-all duration-500"
    >
        <div className="relative overflow-hidden aspect-[4/3] bg-zinc-900">
            <img 
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt="" 
                crossOrigin="anonymous"
            />
        </div>
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-red-600 font-black uppercase text-[9px] tracking-[0.2em]">
                    {story.type || 'DISPATCH'}
                </span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-white leading-tight group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-zinc-500 text-sm font-medium line-clamp-2 leading-relaxed font-sans">
                {story.subtitle}
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <span>By {story.author}</span>
            </div>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const { zineStories: stories, isLoading } = useFestival();
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [activeFilter, setActiveFilter] = useState('ALL'); 
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    const filters = ['ALL', 'SPOTLIGHT', 'NEWS', 'INTERVIEW', 'DEEP_DIVE'];

    useEffect(() => {
        if (storyId && stories.length > 0) {
            const found = stories.find(s => s.id === storyId);
            setActiveStory(found || null);
        } else {
            setActiveStory(null);
        }
    }, [storyId, stories]);

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
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600 relative overflow-x-hidden">
            <SEO 
                title={activeStory ? activeStory.title : "Crate Zine"} 
                description={activeStory ? activeStory.subtitle : "Stay up to date with all that's happening at crate: watch parties, film festivals new releases."} 
                image={activeStory?.heroImage}
                type={activeStory ? "article" : "website"}
            />

            <div className="fixed top-[-10%] right-[-10%] w-[70%] h-[70%] bg-red-600/10 blur-[180px] rounded-full pointer-events-none z-0 animate-pulse"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none z-0"></div>
            <div className="fixed top-[20%] left-[-5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pb-32 relative z-10">
                {!activeStory ? (
                    <div className="space-y-0">
                        <div className="relative pt-48 pb-24 px-6 md:px-20">
                            <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-10">
                                <div className="space-y-4">
                                    <span className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">The Editorial Hub</span>
                                    <h1 className="text-6xl md:text-[10rem] font-serif font-medium tracking-tighter text-white leading-[0.85]">
                                        Crate <span className="italic">Zine.</span>
                                    </h1>
                                </div>
                                <p className="text-xl md:text-3xl text-zinc-500 font-medium max-w-3xl leading-snug font-serif italic">
                                    A curated dispatch on independent cinema, <br className="hidden md:block" />
                                    watch parties, and the distribution afterlife.
                                </p>
                            </div>
                        </div>

                        <div className="sticky top-[72px] z-40 py-8 bg-black/95 backdrop-blur-xl border-y border-zinc-900 flex items-center justify-center gap-6 md:gap-16 overflow-x-auto scrollbar-hide px-6">
                            {filters.map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-black uppercase text-[10px] tracking-[0.3em] transition-all ${activeFilter === f ? 'text-red-600' : 'text-zinc-700 hover:text-white'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-[1600px] mx-auto px-6 md:px-20 pt-24 pb-40">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-32">
                                {filteredStories.length > 0 ? (
                                    filteredStories.map((story) => (
                                        <ZineCard 
                                            key={story.id} 
                                            story={story} 
                                            onClick={() => handleNavigate(story.id)} 
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-48 text-center opacity-30">
                                        <p className="text-zinc-600 uppercase font-black tracking-[0.5em] text-xs">No records found.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <section className="max-w-6xl mx-auto px-6 mt-60 pb-60">
                            <div className="relative p-[1px] bg-gradient-to-r from-red-600 via-purple-600 to-emerald-500 rounded-[4rem] shadow-[0_40px_120px_rgba(239,68,68,0.25)] group transition-all duration-1000">
                                <div className="bg-[#050505] rounded-[4rem] p-12 md:p-24 text-center space-y-12 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12)_0%,transparent_70%)] pointer-events-none"></div>
                                    
                                    <div className="relative z-10 space-y-4">
                                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-2xl">Join the Newsletter.</h2>
                                        <p className="text-gray-400 text-lg md:text-2xl font-medium max-w-2xl mx-auto leading-tight italic">Direct access to festival maps and live watch party reveals.</p>
                                    </div>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-10 rounded-3xl inline-block px-20 animate-bounce">
                                            <p className="text-green-500 font-black uppercase text-sm tracking-[0.5em]">CONNECTION ESTABLISHED ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row gap-4 max-w-xl mx-auto relative z-10">
                                            <input 
                                                type="email" 
                                                placeholder="EMAIL ADDRESS" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-white/5 border-2 border-white/10 p-6 rounded-2xl text-white text-lg outline-none focus:border-red-600 transition-all font-black uppercase tracking-widest placeholder:text-gray-800 shadow-inner"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-white text-black font-black py-6 px-12 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-2xl transition-all hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-50"
                                            >
                                                {subStatus === 'loading' ? 'UPLINKING...' : 'JOIN NEWSLETTER'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="animate-[fadeIn_0.8s_ease-out] bg-[#0a0a0a]">
                        <div className="max-w-[1400px] mx-auto px-6 pt-40 pb-20">
                            <button onClick={() => handleNavigate(null)} className="flex items-center gap-3 text-zinc-600 hover:text-white transition-all uppercase font-black text-[10px] tracking-[0.3em] mb-12">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Archive
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                                <div className="lg:col-span-7 space-y-10">
                                    <div className="space-y-6">
                                        <span className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">{activeStory.type}</span>
                                        <h1 className="text-5xl md:text-8xl font-serif font-medium tracking-tighter text-white leading-[0.9]">{activeStory.title}</h1>
                                        <p className="text-xl md:text-3xl text-zinc-400 font-serif italic leading-snug">"{activeStory.subtitle}"</p>
                                    </div>
                                    <div className="flex items-center gap-6 pt-6 border-t border-zinc-900">
                                        <div className="space-y-1">
                                            <p className="text-zinc-600 font-black uppercase text-[9px] tracking-widest">Written By</p>
                                            <p className="text-white font-bold uppercase text-xs tracking-widest">{activeStory.author}</p>
                                        </div>
                                        <div className="w-px h-8 bg-zinc-900"></div>
                                        <div className="space-y-1">
                                            <p className="text-zinc-600 font-black uppercase text-[9px] tracking-widest">Published</p>
                                            <p className="text-white font-bold uppercase text-xs tracking-widest">{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Record'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-5">
                                    <div className="aspect-[4/5] bg-zinc-900 overflow-hidden shadow-2xl">
                                        <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <article ref={articleRef} className="max-w-[800px] mx-auto px-6 pb-60 pt-20">
                            <div className="space-y-16">
                                {activeStory.sections && activeStory.sections.length > 0 ? (
                                    activeStory.sections.map((section, idx) => (
                                        <div key={section.id}>
                                            {section.type === 'header' && <h3 className="text-3xl md:text-5xl font-serif font-medium text-white mb-8 leading-tight">{section.content}</h3>}
                                            {section.type === 'quote' && (
                                                <div className="py-12 border-y border-zinc-900 my-16">
                                                    <p className="text-2xl md:text-4xl font-serif italic text-white leading-tight text-center max-w-2xl mx-auto">
                                                        "{section.content}"
                                                    </p>
                                                </div>
                                            )}
                                            {section.type === 'image' && (
                                                <div className="my-16">
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto shadow-2xl" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'video' && (
                                                <div className="my-16 aspect-video bg-zinc-900 shadow-2xl">
                                                    <video src={section.content} controls className="w-full h-full object-cover" playsInline />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed mb-8 font-serif">
                                                    {section.content}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed font-serif whitespace-pre-wrap">
                                            {activeStory.content}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-80 pt-32 border-t border-white/10 text-center flex flex-col items-center gap-20">
                                <div className="relative">
                                    <div className="absolute inset-0 blur-[100px] bg-red-600/30 scale-150 rounded-full animate-pulse"></div>
                                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-96 invert relative z-10 opacity-90" alt="Crate TV" />
                                </div>
                                <div className="space-y-10">
                                    <button onClick={() => handleNavigate(null)} className="bg-white text-black font-black px-24 py-8 rounded-[3rem] uppercase tracking-[0.5em] text-sm hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-[0_20px_100px_rgba(255,255,255,0.2)]">Return to Hub</button>
                                </div>
                            </div>
                        </article>
                    </div>
                )}
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => handleNavigate(null)} />
            
            <style>{`
                @keyframes chroma {
                    0% { filter: hue-rotate(0deg); }
                    50% { filter: hue-rotate(20deg); }
                    100% { filter: hue-rotate(0deg); }
                }
                .animate-chroma {
                    animation: chroma 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default ZinePage;
