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
        className="group cursor-pointer bg-black border-b border-white/5 py-12 md:py-20 flex flex-col md:flex-row gap-8 md:gap-20 hover:bg-white/[0.01] transition-all duration-500"
    >
        <div className="w-full md:w-[48%] aspect-video relative overflow-hidden rounded-[2.5rem] bg-gray-900 shadow-2xl">
            <img src={story.heroImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="flex-grow flex flex-col justify-center space-y-6 px-2">
            <div className="flex items-center gap-4">
                <span className="text-red-600 font-black uppercase text-[10px] tracking-[0.5em]">{story.type || 'DISPATCH'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800"></span>
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{story.author}</span>
            </div>
            <h3 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-[0.8] group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-gray-400 text-xl md:text-2xl font-medium max-w-xl leading-relaxed">
                {story.subtitle}
            </p>
            <div className="pt-4">
                <span className="text-white font-black uppercase tracking-widest text-xs border-b-4 border-red-600 pb-2">Read Dispatch →</span>
            </div>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const db = getDbInstance();
        const fetchStories = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }
            try {
                // RESTORED: Explicit sync with 'editorial_stories' collection
                const snap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').get();
                const fetched: EditorialStory[] = [];
                snap.forEach(doc => {
                    fetched.push({ id: doc.id, ...doc.data() } as EditorialStory);
                });
                
                setStories(fetched);
                
                if (storyId) {
                    const found = fetched.find(s => s.id === storyId);
                    setActiveStory(found || null);
                } else {
                    setActiveStory(null);
                }
            } catch (e) {
                console.error("Narrative Restoration Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId]);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubStatus('loading');
        const db = getDbInstance();
        if (db) {
            try {
                await db.collection('zine_subscriptions').doc(email.toLowerCase().trim()).set({
                    email: email.toLowerCase().trim(),
                    timestamp: new Date(),
                    status: 'active'
                });
                setSubStatus('success');
                setEmail('');
            } catch (e) {
                setSubStatus('idle');
            }
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
                    <div className="space-y-32">
                        {/* FEATURE DISPATCH: Massive Tudum Hero */}
                        {stories.length > 0 && (
                            <section 
                                onClick={() => handleNavigate(stories[0].id)}
                                className="relative w-full h-[80vh] md:h-[100vh] cursor-pointer group overflow-hidden border-b border-white/5"
                            >
                                <img src={stories[0].heroImage} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-110" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                                <div className="absolute bottom-32 left-4 md:left-16 max-w-7xl space-y-8">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-5 py-2 rounded-full text-[11px] uppercase tracking-widest shadow-2xl">New Dispatch</span>
                                        <span className="text-white font-black uppercase text-[11px] tracking-[0.5em] drop-shadow-md">{stories[0].type}</span>
                                    </div>
                                    <h1 className="text-7xl md:text-[13rem] font-black uppercase tracking-tighter leading-[0.75] italic drop-shadow-2xl">{stories[0].title}</h1>
                                    <p className="text-2xl md:text-5xl text-gray-200 font-medium max-w-5xl drop-shadow-xl leading-none">{stories[0].subtitle}</p>
                                    <div className="pt-10">
                                        <span className="text-white font-black uppercase tracking-[0.4em] text-sm border-b-8 border-red-600 pb-3">Explore Investigation</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* LIST: Prestigious News Grid */}
                        <div className="max-w-[1700px] mx-auto px-4 md:px-16">
                            <div className="flex items-center justify-between border-b border-white/5 pb-10 mb-16">
                                <h2 className="text-sm font-black uppercase tracking-[0.7em] text-gray-700">Chronicle // Dispatch Logs</h2>
                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Global Record Active</p>
                            </div>
                            <div className="divide-y divide-white/5">
                                {stories.slice(1).map(story => (
                                    <ZineStoryCard key={story.id} story={story} onClick={() => handleNavigate(story.id)} />
                                ))}
                            </div>
                        </div>

                        {/* NEWSLETTER HUB */}
                        <section className="max-w-5xl mx-auto px-4">
                            <div className="bg-white/5 border border-white/10 p-16 md:p-32 rounded-[5rem] text-center space-y-10 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none"></div>
                                <div className="relative z-10 space-y-8">
                                    <h3 className="text-5xl md:text-9xl font-black uppercase tracking-tighter italic leading-none">Join the Node.</h3>
                                    <p className="text-gray-400 text-xl md:text-3xl font-medium max-w-3xl mx-auto leading-relaxed">The definitive record of the independent cinematic underground, delivered to your sector.</p>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-8 rounded-3xl inline-block px-16">
                                            <p className="text-green-500 font-black uppercase text-sm tracking-widest">Uplink Secured ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto pt-10">
                                            <input 
                                                type="email" 
                                                placeholder="email@sector.node" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-black/60 border border-white/10 p-8 rounded-3xl text-white text-2xl outline-none focus:border-red-600 transition-all font-medium"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-red-600 hover:bg-red-700 text-white font-black py-8 px-16 rounded-3xl uppercase text-[13px] tracking-widest shadow-2xl transition-all active:scale-95"
                                            >
                                                Activate Link
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="max-w-[1700px] mx-auto px-4 md:px-16 animate-[fadeIn_0.6s_ease-out]">
                        <div className="max-w-5xl mx-auto">
                            <button onClick={() => handleNavigate(null)} className="mb-20 flex items-center gap-4 text-gray-500 hover:text-white transition-colors uppercase font-black text-xs tracking-widest group">
                                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Records
                            </button>

                            <article ref={articleRef} className="space-y-20">
                                <header className="space-y-12">
                                    <div className="flex items-center gap-6">
                                        <span className="bg-red-600 text-white font-black px-5 py-2 rounded-full text-[11px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                        <span className="text-xs text-gray-700 font-black uppercase tracking-widest">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Transmission'}
                                        </span>
                                    </div>
                                    <h1 className="text-7xl md:text-[12rem] font-black uppercase tracking-tighter leading-[0.7] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-4xl md:text-6xl text-gray-400 font-medium leading-none">{activeStory.subtitle}</p>
                                    <div className="pt-12 border-b border-white/5 pb-16 flex items-center gap-8">
                                        <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-black text-xl">C</div>
                                        <p className="text-base font-black uppercase tracking-widest text-gray-500">Dispatch Authored By {activeStory.author}</p>
                                    </div>
                                </header>

                                <div className="space-y-28">
                                    {activeStory.heroImage && (
                                        <div className="aspect-video rounded-[5rem] overflow-hidden border border-white/10 shadow-2xl">
                                            <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}

                                    <div className="max-w-4xl mx-auto space-y-20">
                                        {(activeStory.sections || []).map((section, idx) => (
                                            <div key={section.id}>
                                                {section.type === 'header' && <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-red-600 mt-32 mb-16 border-l-[12px] border-red-600 pl-12">{section.content}</h3>}
                                                {section.type === 'quote' && <div className="bg-white/5 border-l-[20px] border-white p-20 text-5xl font-black uppercase italic tracking-tight text-white my-24 rounded-r-[4rem] shadow-2xl">"{section.content}"</div>}
                                                {section.type === 'image' && <div className="rounded-[4rem] overflow-hidden border border-white/5 shadow-2xl my-28"><img src={section.content} className="w-full h-auto" alt="" /></div>}
                                                {section.type === 'text' && (
                                                    <div className="relative">
                                                        {idx === 0 && (
                                                            <span className="float-left text-[13rem] md:text-[18rem] font-black italic leading-[0.6] pr-16 mr-6 mt-8 text-red-600 drop-shadow-2xl select-none">
                                                                {section.content.charAt(0)}
                                                            </span>
                                                        )}
                                                        <p className="text-2xl md:text-5xl text-gray-300 font-medium leading-tight md:leading-[1.05] tracking-tight">
                                                            {idx === 0 ? section.content.slice(1) : section.content}
                                                        </p>
                                                        <div className="clear-both"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-48 border-t border-white/5 text-center flex flex-col items-center gap-12">
                                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-64 opacity-20 invert" alt="" />
                                    <p className="text-[14px] font-black text-gray-800 uppercase tracking-[2.5em] mr-[-2.5em]">WWW.CRATETV.NET</p>
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