import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory } from '../types';
import { getDbInstance } from '../services/firebaseClient';

const ZineStoryCard: React.FC<{ story: EditorialStory; onClick: () => void }> = ({ story, onClick }) => (
    <div 
        onClick={onClick}
        className="group cursor-pointer bg-black border-b border-white/5 py-8 md:py-12 flex flex-col md:flex-row gap-8 md:gap-12 hover:bg-white/[0.01] transition-all duration-500"
    >
        <div className="w-full md:w-[35%] aspect-video relative overflow-hidden rounded-2xl bg-[#0a0a0a] shadow-2xl">
            <img 
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt="" 
                crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="flex-grow flex flex-col justify-center space-y-4 px-2">
            <div className="flex items-center gap-3">
                <span className="text-red-600 font-black uppercase text-[9px] tracking-[0.4em]">{story.type || 'DISPATCH'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800"></span>
                <span className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">{story.author}</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-gray-400 text-base md:text-lg font-medium max-w-2xl leading-snug">
                {story.subtitle}
            </p>
            <div className="pt-2">
                <span className="text-white font-black uppercase tracking-widest text-[10px] border-b-2 border-red-600 pb-1 transition-all group-hover:tracking-[0.2em] group-hover:text-red-500">Read Dispatch →</span>
            </div>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [hpValue, setHpValue] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const fetchStories = async () => {
            const db = getDbInstance();
            if (!db) {
                // Wait for DB initialization
                setTimeout(fetchStories, 500);
                return;
            }
            try {
                // Try fetch with order first
                let snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                
                // Fallback for missing index
                if (snap.empty) {
                    snap = await db.collection('editorial_stories').get();
                }

                const fetched: EditorialStory[] = [];
                snap.forEach(doc => {
                    fetched.push({ id: doc.id, ...doc.data() } as EditorialStory);
                });
                
                // Sort manually if index failed/missing
                fetched.sort((a, b) => {
                    const dateA = a.publishedAt?.seconds || 0;
                    const dateB = b.publishedAt?.seconds || 0;
                    return dateB - dateA;
                });

                setStories(fetched);
                
                if (storyId) {
                    const found = fetched.find(s => s.id === storyId);
                    setActiveStory(found || null);
                } else {
                    setActiveStory(null);
                }
            } catch (e) {
                console.error("Zine Downlink Error:", e);
                // Last resort: Check if collection exists without order
                try {
                    const basicSnap = await db.collection('editorial_stories').get();
                    const basicFetched: EditorialStory[] = [];
                    basicSnap.forEach(doc => basicFetched.push({ id: doc.id, ...doc.data() } as EditorialStory));
                    setStories(basicFetched);
                } catch (e2) {}
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId]);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (hpValue) return; 
        
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
        } catch (e) {
            setSubStatus('idle');
        }
    };

    const handleNavigate = (id: string | null) => {
        const path = id ? `/zine/${id}` : '/zine';
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600">
            <SEO 
                title={activeStory ? activeStory.title : "Crate Zine"} 
                description={activeStory ? activeStory.subtitle : "Editorial dispatches from the independent cinematic underground."} 
                image={activeStory?.heroImage}
                type={activeStory ? "article" : "website"}
            />
            
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pt-24 pb-32">
                {!activeStory ? (
                    <div className="space-y-12">
                        {stories.length > 0 ? (
                            <>
                                <section 
                                    onClick={() => handleNavigate(stories[0].id)}
                                    className="relative w-full h-[55vh] md:h-[70vh] cursor-pointer group overflow-hidden border-[12px] border-red-600 bg-black"
                                >
                                    <img 
                                        src={`/api/proxy-image?url=${encodeURIComponent(stories[0].heroImage)}`} 
                                        className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-110" 
                                        alt="" 
                                        crossOrigin="anonymous"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                    <div className="absolute bottom-10 left-6 md:left-16 max-w-5xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-red-600 text-white font-black uppercase text-[10px] px-3 py-1 rounded-lg tracking-[0.2em] shadow-2xl">{stories[0].type}</span>
                                            <span className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em]">Current Feature</span>
                                        </div>
                                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] italic drop-shadow-2xl">{stories[0].title}</h1>
                                        <p className="text-lg md:text-2xl text-gray-200 font-medium max-w-2xl drop-shadow-xl leading-snug">{stories[0].subtitle}</p>
                                    </div>
                                </section>

                                <div className="max-w-[1400px] mx-auto px-6 md:px-12">
                                    <div className="divide-y divide-white/5">
                                        {/* Show remaining stories or show empty state if only 1 exists */}
                                        {stories.length > 1 ? stories.slice(1).map(story => (
                                            <ZineStoryCard key={story.id} story={story} onClick={() => handleNavigate(story.id)} />
                                        )) : (
                                            <div className="py-20 text-center opacity-30 border-t border-white/5 mt-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">End of Dispatch Log</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="max-w-4xl mx-auto py-48 text-center px-6">
                                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Network Synchronizing</span>
                                </div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white mb-4">Awaiting Dispatch Manifest...</h2>
                                <p className="text-gray-500 max-w-md mx-auto">Connecting to the editorial archive. Please stand by for narrative uplink.</p>
                            </div>
                        )}

                        <section className="max-w-4xl mx-auto px-6 pt-20">
                            <div className="bg-white/5 border border-white/10 p-10 md:p-20 rounded-[3.5rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] pointer-events-none"></div>
                                <div className="relative z-10 space-y-6">
                                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">Sign up for newsletter.</h2>
                                    <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">Stay up to date on what's happening at Crate.</p>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-3xl inline-block px-12 animate-[fadeIn_0.5s_ease-out]">
                                            <p className="text-green-500 font-black uppercase text-xs tracking-[0.3em]">Uplink Secured ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto pt-6">
                                            <div style={{ display: 'none' }} aria-hidden="true">
                                                <input type="text" value={hpValue} onChange={e => setHpValue(e.target.value)} tabIndex={-1} autoComplete="off" />
                                            </div>
                                            <input 
                                                type="email" 
                                                placeholder="email@sector.node" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-black/60 border-2 border-white/10 p-4 rounded-2xl text-white text-lg outline-none focus:border-red-600 transition-all font-medium placeholder:text-gray-800"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
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
                    <div className="max-w-[1400px] mx-auto px-6 md:px-12 animate-[fadeIn_0.6s_ease-out]">
                        <div className="max-w-4xl mx-auto">
                            <button onClick={() => handleNavigate(null)} className="mb-12 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest group">
                                <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Records
                            </button>

                            <article ref={articleRef} className="space-y-16">
                                <header className="space-y-8">
                                    <div className="flex items-center gap-6">
                                        <span className="bg-red-600 text-white font-black px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                        <span className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active Dispatch'}
                                        </span>
                                    </div>
                                    <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-2xl md:text-4xl text-gray-400 font-medium leading-tight tracking-tighter">{activeStory.subtitle}</p>
                                    <div className="pt-8 border-b border-white/5 pb-10 flex items-center gap-6">
                                        <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-500/20 text-red-500 font-black text-xl">C</div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">Dispatch Author</p>
                                            <p className="text-lg font-bold uppercase tracking-widest text-white">{activeStory.author}</p>
                                        </div>
                                    </div>
                                </header>

                                <div className="space-y-16">
                                    {activeStory.heroImage && (
                                        <div className="aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] bg-[#050505]">
                                            <img src={`/api/proxy-image?url=${encodeURIComponent(activeStory.heroImage)}`} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                                        </div>
                                    )}

                                    <div className="max-w-3xl mx-auto space-y-14">
                                        {activeStory.sections && activeStory.sections.length > 0 ? (
                                            activeStory.sections.map((section, idx) => (
                                                <div key={section.id}>
                                                    {section.type === 'header' && <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600 mt-20 mb-8 border-l-[8px] border-red-600 pl-8 leading-none">{section.content}</h3>}
                                                    {section.type === 'quote' && <div className="bg-white/5 border-l-[12px] border-white p-10 text-2xl md:text-4xl font-black uppercase italic tracking-tight text-white my-16 rounded-r-3xl shadow-2xl leading-tight">"{section.content}"</div>}
                                                    {section.type === 'image' && <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl my-14 bg-[#050505]"><img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto" alt="" crossOrigin="anonymous" /></div>}
                                                    {section.type === 'text' && (
                                                        <div className="relative">
                                                            {idx === 0 && section.content && (
                                                                <span className="float-left text-[8rem] md:text-[11rem] font-black italic leading-[0.6] pr-6 mr-4 mt-6 text-red-600 drop-shadow-2xl select-none">
                                                                    {section.content.charAt(0)}
                                                                </span>
                                                            )}
                                                            <p className="text-xl md:text-2xl text-gray-300 font-medium leading-relaxed tracking-tight">
                                                                {idx === 0 && section.content ? section.content.slice(1) : section.content}
                                                            </p>
                                                            <div className="clear-both"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="prose prose-invert max-w-none">
                                                <p className="text-xl md:text-2xl text-gray-300 font-medium leading-relaxed tracking-tight whitespace-pre-wrap">
                                                    {activeStory.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-32 border-t border-white/5 text-center flex flex-col items-center gap-8">
                                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-48 opacity-20 invert" alt="" />
                                    <p className="text-[11px] font-black text-gray-800 uppercase tracking-[1.5em] mr-[-1.5em]">WWW.CRATETV.NET</p>
                                </div>
                            </article>
                        </div>
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