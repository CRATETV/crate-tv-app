
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
        className="group cursor-pointer flex flex-col gap-4 transition-all duration-500"
    >
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 aspect-[16/9] shadow-lg">
            <img 
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt="" 
                crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500"></div>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold uppercase text-[10px] tracking-wider">
                    {story.type || 'DISPATCH'}
                </span>
                <span className="text-zinc-600 text-[10px]">•</span>
                <span className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">{story.author}</span>
            </div>
            <h3 className="font-bold text-white text-xl md:text-2xl leading-tight group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-zinc-400 text-sm font-medium line-clamp-2 leading-relaxed">
                {story.subtitle}
            </p>
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
                        <div className="relative pt-40 pb-16 px-6 md:px-20 text-center">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white">
                                    CRATE <span className="text-red-600">ZINE</span>
                                </h1>
                                <p className="text-lg md:text-2xl text-zinc-400 font-medium leading-relaxed">
                                    The latest dispatches from the distribution afterlife. <br className="hidden md:block" />
                                    Watch parties, film festivals, and independent cinema culture.
                                </p>
                            </div>
                        </div>

                        <div className="sticky top-[72px] z-40 py-6 bg-black/90 backdrop-blur-md border-y border-zinc-800 flex items-center justify-center gap-4 md:gap-10 overflow-x-auto scrollbar-hide px-6">
                            {filters.map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-bold uppercase text-[10px] md:text-xs tracking-widest transition-all px-4 py-2 rounded-full ${activeFilter === f ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-[1400px] mx-auto px-6 md:px-20 pt-16 pb-40">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
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
                                        <p className="text-zinc-600 uppercase font-bold tracking-widest text-sm">No dispatches found in this sector.</p>
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
                    <div className="animate-[fadeIn_0.8s_ease-out]">
                        <div className="relative w-full h-[50vh] md:h-[70vh] mb-12 overflow-hidden bg-zinc-950">
                            <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover opacity-60" alt="" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto space-y-8">
                                <button onClick={() => handleNavigate(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all uppercase font-bold text-[10px] tracking-widest bg-black/60 px-6 py-2 rounded-full border border-zinc-800 backdrop-blur-sm">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Back to Zine
                                </button>
                                <div className="space-y-4">
                                    <span className="text-red-600 font-bold uppercase text-xs tracking-widest">{activeStory.type}</span>
                                    <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white leading-tight">{activeStory.title}</h1>
                                    <p className="text-lg md:text-2xl text-zinc-300 font-medium max-w-3xl mx-auto leading-relaxed">{activeStory.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-4 text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                                    <span>By {activeStory.author}</span>
                                    <span>•</span>
                                    <span>{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Record'}</span>
                                </div>
                            </div>
                        </div>

                        <article ref={articleRef} className="max-w-[800px] mx-auto px-6 pb-60">
                            <div className="space-y-12">
                                {activeStory.sections && activeStory.sections.length > 0 ? (
                                    activeStory.sections.map((section, idx) => (
                                        <div key={section.id}>
                                            {section.type === 'header' && <h3 className="text-2xl md:text-4xl font-bold text-white mb-6 leading-tight">{section.content}</h3>}
                                            {section.type === 'quote' && (
                                                <div className="border-l-4 border-red-600 pl-8 py-4 my-12">
                                                    <p className="text-xl md:text-3xl font-bold italic text-zinc-100 leading-snug">"{section.content}"</p>
                                                </div>
                                            )}
                                            {section.type === 'image' && (
                                                <div className="rounded-2xl overflow-hidden shadow-xl my-12 bg-zinc-900">
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'video' && (
                                                <div className="rounded-2xl overflow-hidden shadow-xl my-12 bg-zinc-900 aspect-video">
                                                    <video src={section.content} controls className="w-full h-full object-cover" playsInline />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <p className="text-lg md:text-xl text-zinc-300 font-medium leading-relaxed mb-8">
                                                    {section.content}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-lg md:text-xl text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
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
