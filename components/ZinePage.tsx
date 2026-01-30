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
        className="group cursor-pointer flex flex-col gap-6 transition-all duration-700 hover:-translate-y-3"
    >
        <div className="relative overflow-hidden rounded-[2.5rem] bg-black shadow-2xl border border-white/5 aspect-[16/10] backdrop-blur-sm">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-purple-600 to-emerald-500 rounded-[2.5rem] blur opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
            
            <img 
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`} 
                className="relative w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0" 
                alt="" 
                crossOrigin="anonymous"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90"></div>
            
            <div className="absolute top-6 left-6">
                <span className={`${story.type === 'SPOTLIGHT' ? 'bg-red-600 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-white/10 backdrop-blur-md'} text-white font-black uppercase text-[9px] px-4 py-1.5 rounded-full tracking-[0.2em] shadow-2xl border border-white/10`}>
                    {story.type || 'DISPATCH'}
                </span>
            </div>

            <div className="absolute bottom-8 left-8 right-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-black text-white uppercase tracking-tighter italic leading-none text-2xl md:text-3xl drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                    {story.title}
                </h3>
            </div>
        </div>
        <div className="px-2 space-y-3">
            <p className="text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                {story.subtitle}
            </p>
            <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-red-600 group-hover:w-12 transition-all duration-500"></div>
                <span className="text-gray-600 font-black uppercase text-[10px] tracking-widest">{story.author}</span>
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
                        <div className="relative pt-60 pb-24 px-6 md:px-20 text-center space-y-12">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-600/20 px-6 py-2 rounded-full mb-4 mx-auto shadow-2xl backdrop-blur-md">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                                    <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px]">Active Dispatch Network</p>
                                </div>
                                <h1 className="text-7xl md:text-[12rem] font-black uppercase tracking-tighter leading-[0.8] italic bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent drop-shadow-[0_20px_60px_rgba(0,0,0,1)] py-2 animate-chroma">
                                    Crate Zine.
                                </h1>
                            </div>
                            <p className="text-xl md:text-4xl text-gray-300 font-bold max-w-4xl mx-auto leading-tight italic drop-shadow-lg tracking-tight">
                                Stay up to date with all that's happening at Crate: <br className="hidden md:block" /> 
                                <span className="text-white">Watch parties, film festivals, and exclusive new releases.</span>
                            </p>
                        </div>

                        <div className="sticky top-[72px] z-40 py-10 bg-[#050505]/80 backdrop-blur-3xl border-y border-white/5 flex items-center justify-center gap-6 md:gap-14 overflow-x-auto scrollbar-hide px-6 shadow-2xl">
                            {filters.map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-black uppercase text-[10px] md:text-xs tracking-[0.4em] transition-all pb-2 border-b-2 ${activeFilter === f ? 'text-red-600 border-red-600 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'text-gray-700 border-transparent hover:text-white'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-[1800px] mx-auto px-6 md:px-20 pt-24 pb-40">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-24">
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
                                        <p className="text-gray-600 uppercase font-black tracking-[0.8em] text-xs">Scanning archives for Node: {activeFilter}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <section className="max-w-6xl mx-auto px-6 pb-40">
                            <div className="relative p-[1px] bg-gradient-to-r from-red-600 via-purple-600 to-emerald-500 rounded-[4rem] shadow-[0_40px_120px_rgba(239,68,68,0.25)] group transition-all duration-1000">
                                <div className="bg-[#050505] rounded-[4rem] p-12 md:p-24 text-center space-y-12 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12)_0%,transparent_70%)] pointer-events-none"></div>
                                    
                                    <div className="relative z-10 space-y-4">
                                        <p className="text-red-500 font-black uppercase tracking-[0.8em] text-[10px] mb-4">Frequency Connection</p>
                                        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-2xl">Join the Dispatch.</h2>
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
                                                placeholder="NODE@EMAIL.ADDRESS" 
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
                                                {subStatus === 'loading' ? 'UPLINKING...' : 'DISPATCH ME'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="animate-[fadeIn_0.8s_ease-out]">
                        <div className="relative w-full h-[65vh] md:h-[85vh] mb-20 overflow-hidden bg-black shadow-[0_50px_100px_rgba(0,0,0,1)]">
                            <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover blur-2xl opacity-40 scale-125" alt="" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/40"></div>
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-6xl mx-auto space-y-12">
                                <button onClick={() => handleNavigate(null)} className="flex items-center gap-4 text-gray-500 hover:text-white transition-all uppercase font-black text-[11px] tracking-widest group bg-black/40 px-8 py-3 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Return to Archive
                                </button>
                                <div className="space-y-8">
                                    <div className="flex justify-center gap-3">
                                        <span className={`${activeStory.type === 'SPOTLIGHT' ? 'bg-red-600 shadow-[0_0_15px_red]' : 'bg-white/10'} text-white font-black px-5 py-1.5 rounded-full text-[10px] uppercase tracking-widest shadow-2xl`}>{activeStory.type}</span>
                                        <span className="bg-white/10 backdrop-blur-md text-white font-black px-5 py-1.5 rounded-full text-[10px] uppercase tracking-widest border border-white/10">{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Record'}</span>
                                    </div>
                                    <h1 className="text-6xl md:text-[12rem] font-black uppercase tracking-tighter leading-[0.8] italic text-white drop-shadow-[0_20px_80px_rgba(0,0,0,1)]">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-5xl text-gray-400 font-bold tracking-tighter leading-tight max-w-5xl mx-auto opacity-90 italic">"{activeStory.subtitle}"</p>
                                </div>
                                <div className="flex items-center gap-8 pt-10 border-t border-white/5 w-full justify-center">
                                    <span className="flex items-center gap-3 text-red-500 font-black uppercase text-[12px] tracking-widest">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_15px_red]"></div>
                                        Dispatch by {activeStory.author}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <article ref={articleRef} className="max-w-[1200px] mx-auto px-6 pb-60">
                            <div className="space-y-32">
                                {activeStory.sections && activeStory.sections.length > 0 ? (
                                    activeStory.sections.map((section, idx) => (
                                        <div key={section.id}>
                                            {section.type === 'header' && <h3 className="text-5xl md:text-[9rem] font-black uppercase tracking-tighter italic text-red-600 mb-12 leading-[0.9] drop-shadow-2xl">{section.content}</h3>}
                                            {section.type === 'quote' && (
                                                <div className="bg-white/5 border-l-[24px] border-red-600 p-12 md:p-24 text-3xl md:text-6xl font-black uppercase italic tracking-tighter text-white my-32 rounded-r-[4rem] shadow-[0_40px_120px_rgba(239,68,68,0.2)] leading-[0.95] relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                                    <span className="relative z-10">"{section.content}"</span>
                                                </div>
                                            )}
                                            {section.type === 'image' && (
                                                <div className="rounded-[4.5rem] overflow-hidden border border-white/10 shadow-[0_80px_160px_rgba(0,0,0,0.9)] my-24 bg-black group relative">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto transition-transform duration-[6000ms] group-hover:scale-105" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <div className="relative group/text">
                                                    {/* DROP CAP REFINEMENT FOR OUTLINE FIX */}
                                                    {idx === 0 && section.content && (
                                                        <span className="float-left text-[14rem] md:text-[18rem] font-black italic leading-[0.75] pr-10 mr-10 mt-2 text-red-600 drop-shadow-[0_25px_60px_rgba(239,68,68,0.6)] select-none animate-pulse skew-x-[-6deg]">
                                                            {section.content.charAt(0)}
                                                        </span>
                                                    )}
                                                    <p className="text-3xl md:text-5xl lg:text-6xl text-white font-black leading-[1.05] tracking-tighter italic uppercase drop-shadow-lg text-justify md:text-left">
                                                        {idx === 0 && section.content ? section.content.slice(1) : section.content}
                                                    </p>
                                                    <div className="clear-both"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-3xl md:text-6xl text-white font-black leading-tight tracking-tighter italic uppercase whitespace-pre-wrap">
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
                                    <p className="text-[20px] font-black text-gray-800 uppercase tracking-[3.5em] mr-[-3.5em]">END OF DISPATCH</p>
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