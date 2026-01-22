import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import { useAuth } from '../contexts/AuthContext';

const ZineStoryCard: React.FC<{ story: EditorialStory; onClick: () => void }> = ({ story, onClick }) => (
    <div 
        onClick={onClick}
        className="group cursor-pointer bg-black border-b border-white/5 py-12 md:py-16 flex flex-col md:flex-row gap-8 md:gap-16 hover:bg-white/[0.01] transition-all duration-500"
    >
        <div className="w-full md:w-[40%] aspect-video relative overflow-hidden rounded-2xl bg-gray-900">
            <img src={story.heroImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="flex-grow flex flex-col justify-center space-y-4 px-2">
            <div className="flex items-center gap-4">
                <span className="text-red-600 font-black uppercase text-[10px] tracking-[0.4em]">{story.type}</span>
                <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{story.author}</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-[0.9] group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                {story.subtitle}
            </p>
            <div className="pt-4">
                <span className="text-white font-black uppercase tracking-widest text-[10px] border-b-2 border-red-600 pb-1">Read Dispatch →</span>
            </div>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const { authInitialized } = useAuth();
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!authInitialized) return;

        const db = getDbInstance();
        const fetchStories = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }
            try {
                // RESTORED: Fixed logic to load all previous dispatches from 'editorial_stories'
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
                console.error("Zine Narrative Sync Error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [storyId, authInitialized]);

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
                        {/* FEATURE DISPATCH: Tudum Hero */}
                        {stories.length > 0 && (
                            <section 
                                onClick={() => handleNavigate(stories[0].id)}
                                className="relative w-full h-[70vh] md:h-[90vh] cursor-pointer group overflow-hidden border-b border-white/5"
                            >
                                <img src={stories[0].heroImage} className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                <div className="absolute bottom-24 left-4 md:left-12 max-w-5xl space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-red-600 text-white font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest shadow-2xl">New Dispatch</span>
                                        <span className="text-white font-black uppercase text-[10px] tracking-[0.4em] drop-shadow-md">{stories[0].type}</span>
                                    </div>
                                    <h1 className="text-6xl md:text-[11rem] font-black uppercase tracking-tighter leading-[0.8] italic drop-shadow-2xl">{stories[0].title}</h1>
                                    <p className="text-2xl md:text-4xl text-gray-200 font-medium max-w-3xl drop-shadow-xl leading-tight">{stories[0].subtitle}</p>
                                    <div className="pt-6">
                                        <span className="text-white font-black uppercase tracking-[0.3em] text-xs border-b-4 border-red-600 pb-2">Read Article</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* LIST: Minimalist Feed */}
                        <div className="max-w-[1600px] mx-auto px-4 md:px-12">
                            <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-12">
                                <h2 className="text-sm font-black uppercase tracking-[0.6em] text-gray-700">Chronicle // Dispatch Logs</h2>
                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Global Record Active</p>
                            </div>
                            <div className="divide-y divide-white/5">
                                {stories.slice(1).map(story => (
                                    <ZineStoryCard key={story.id} story={story} onClick={() => handleNavigate(story.id)} />
                                ))}
                            </div>
                        </div>

                        {/* SUBSCRIBE: Node Activation */}
                        <section className="max-w-4xl mx-auto px-4">
                            <div className="bg-white/5 border border-white/10 p-12 md:p-20 rounded-[4rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                                <div className="relative z-10 space-y-6">
                                    <h3 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">Join the List.</h3>
                                    <p className="text-gray-400 text-lg md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">The definitive record of the independent cinematic underground, delivered to your sector.</p>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-6 rounded-3xl inline-block px-12 animate-[fadeIn_0.4s_ease-out]">
                                            <p className="text-green-500 font-black uppercase text-xs tracking-widest">Uplink Secured ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto pt-8">
                                            <input 
                                                type="email" 
                                                placeholder="email@sector.node" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-black/40 border border-white/10 p-6 rounded-2xl text-white text-lg outline-none focus:border-red-600 transition-all font-medium"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-12 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95"
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
                    <div className="max-w-[1600px] mx-auto px-4 md:px-12 animate-[fadeIn_0.6s_ease-out]">
                        <div className="max-w-4xl mx-auto">
                            <button onClick={() => handleNavigate(null)} className="mb-12 flex items-center gap-3 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest group">
                                <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Records
                            </button>

                            <article ref={articleRef} className="space-y-16">
                                <header className="space-y-10">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                        <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Transmission'}
                                        </span>
                                    </div>
                                    <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.75] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-3xl md:text-5xl text-gray-400 font-medium leading-none">{activeStory.subtitle}</p>
                                    <div className="pt-8 border-b border-white/5 pb-10 flex items-center gap-6">
                                        <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-black text-sm">C</div>
                                        <p className="text-sm font-black uppercase tracking-widest text-gray-500">Dispatch Authored By {activeStory.author}</p>
                                    </div>
                                </header>

                                <div className="space-y-20">
                                    {activeStory.heroImage && (
                                        <div className="aspect-video rounded-[3.5rem] overflow-hidden border border-white/10 shadow-2xl">
                                            <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}

                                    <div className="max-w-3xl mx-auto space-y-12">
                                        {(activeStory.sections || []).map((section, idx) => (
                                            <div key={section.id}>
                                                {section.type === 'header' && <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-red-600 mt-24 mb-10 border-l-8 border-red-600 pl-8">{section.content}</h3>}
                                                {section.type === 'quote' && <div className="bg-white/5 border-l-8 border-white p-12 text-3xl font-black uppercase italic tracking-tight text-white my-16 rounded-r-3xl shadow-xl">"{section.content}"</div>}
                                                {section.type === 'image' && <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl my-20"><img src={section.content} className="w-full h-auto" alt="" /></div>}
                                                {section.type === 'text' && (
                                                    <div className="relative">
                                                        {idx === 0 && (
                                                            <span className="float-left text-[9rem] md:text-[13rem] font-black italic leading-[0.75] pr-12 mr-2 mt-4 text-red-600 drop-shadow-2xl select-none">
                                                                {section.content.charAt(0)}
                                                            </span>
                                                        )}
                                                        <p className="text-xl md:text-3xl text-gray-300 font-medium leading-relaxed">
                                                            {idx === 0 ? section.content.slice(1) : section.content}
                                                        </p>
                                                        <div className="clear-both"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-32 border-t border-white/5 text-center flex flex-col items-center gap-6">
                                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-40 opacity-20 invert" alt="" />
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