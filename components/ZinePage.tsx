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
        className="group cursor-pointer bg-black border-b border-white/5 py-12 md:py-24 flex flex-col md:flex-row gap-8 md:gap-24 hover:bg-white/[0.01] transition-all duration-500"
    >
        <div className="w-full md:w-[48%] aspect-video relative overflow-hidden rounded-[2.5rem] bg-gray-900 shadow-2xl">
            <img src={story.heroImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="flex-grow flex flex-col justify-center space-y-6 px-2">
            <div className="flex items-center gap-4">
                <span className="text-red-600 font-black uppercase text-[10px] tracking-[0.6em]">{story.type || 'DISPATCH'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-800"></span>
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{story.author}</span>
            </div>
            <h3 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-[0.8] group-hover:text-red-500 transition-colors">
                {story.title}
            </h3>
            <p className="text-gray-400 text-xl md:text-2xl font-medium max-w-xl leading-tight">
                {story.subtitle}
            </p>
            <div className="pt-4">
                <span className="text-white font-black uppercase tracking-widest text-[11px] border-b-4 border-red-600 pb-2 transition-all group-hover:tracking-[0.2em]">Read Dispatch →</span>
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
                        {stories.length > 0 && (
                            <section 
                                onClick={() => handleNavigate(stories[0].id)}
                                className="relative w-full h-[80vh] md:h-[100vh] cursor-pointer group overflow-hidden border-b border-white/5"
                            >
                                <img src={stories[0].heroImage} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-110" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                <div className="absolute bottom-32 left-4 md:left-16 max-w-7xl space-y-8">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-red-600 text-white font-black px-6 py-2 rounded-full text-[11px] uppercase tracking-widest shadow-2xl">New Transmission</span>
                                        <span className="text-white font-black uppercase text-[11px] tracking-[0.5em] drop-shadow-md">{stories[0].type}</span>
                                    </div>
                                    <h1 className="text-7xl md:text-[14rem] font-black uppercase tracking-tighter leading-[0.7] italic drop-shadow-2xl">{stories[0].title}</h1>
                                    <p className="text-2xl md:text-5xl text-gray-200 font-medium max-w-5xl drop-shadow-xl leading-none">{stories[0].subtitle}</p>
                                    <div className="pt-10">
                                        <span className="text-white font-black uppercase tracking-[0.4em] text-sm border-b-8 border-red-600 pb-3 transition-all group-hover:tracking-[0.8em]">Explore Investigation</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="max-w-[1800px] mx-auto px-4 md:px-16">
                            <div className="flex items-center justify-between border-b border-white/5 pb-12 mb-16">
                                <h2 className="text-sm font-black uppercase tracking-[0.8em] text-gray-700">Chronicle // Dispatch Logs</h2>
                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Global Record Active</p>
                            </div>
                            <div className="divide-y divide-white/5">
                                {stories.slice(1).map(story => (
                                    <ZineStoryCard key={story.id} story={story} onClick={() => handleNavigate(story.id)} />
                                ))}
                            </div>
                        </div>

                        <section className="max-w-6xl mx-auto px-4">
                            <div className="bg-white/5 border border-white/10 p-16 md:p-32 rounded-[5rem] text-center space-y-12 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none"></div>
                                <div className="relative z-10 space-y-10">
                                    <h3 className="text-5xl md:text-[10rem] font-black uppercase tracking-tighter italic leading-none">Join the Node.</h3>
                                    <p className="text-gray-400 text-xl md:text-4xl font-medium max-w-3xl mx-auto leading-tight">The definitive record of independent cinematic movement, delivered to your sector.</p>
                                    
                                    {subStatus === 'success' ? (
                                        <div className="bg-green-600/10 border border-green-500/20 p-10 rounded-3xl inline-block px-20">
                                            <p className="text-green-500 font-black uppercase text-sm tracking-widest">Uplink Secured ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-8 max-w-3xl mx-auto pt-10">
                                            <input 
                                                type="email" 
                                                placeholder="email@sector.node" 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-black/60 border border-white/10 p-10 rounded-3xl text-white text-3xl outline-none focus:border-red-600 transition-all font-medium placeholder:text-gray-800"
                                                required
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={subStatus === 'loading'}
                                                className="bg-red-600 hover:bg-red-700 text-white font-black py-10 px-20 rounded-3xl uppercase text-[14px] tracking-widest shadow-2xl transition-all active:scale-95"
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
                    <div className="max-w-[1800px] mx-auto px-4 md:px-16 animate-[fadeIn_0.6s_ease-out]">
                        <div className="max-w-5xl mx-auto">
                            <button onClick={() => handleNavigate(null)} className="mb-20 flex items-center gap-4 text-gray-500 hover:text-white transition-colors uppercase font-black text-sm tracking-widest group">
                                <svg className="w-6 h-6 transform group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to All Records
                            </button>

                            <article ref={articleRef} className="space-y-24">
                                <header className="space-y-12">
                                    <div className="flex items-center gap-8">
                                        <span className="bg-red-600 text-white font-black px-6 py-2 rounded-full text-[12px] uppercase tracking-widest shadow-xl">{activeStory.type}</span>
                                        <span className="text-xs text-gray-700 font-black uppercase tracking-widest">
                                            {activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Active Dispatch'}
                                        </span>
                                    </div>
                                    <h1 className="text-7xl md:text-[13rem] font-black uppercase tracking-tighter leading-[0.7] italic drop-shadow-2xl">{activeStory.title}</h1>
                                    <p className="text-4xl md:text-7xl text-gray-400 font-medium leading-[0.85] tracking-tight">{activeStory.subtitle}</p>
                                    <div className="pt-16 border-b border-white/5 pb-20 flex items-center gap-10">
                                        <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-black text-2xl">C</div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-600">Dispatch Author</p>
                                            <p className="text-xl font-bold uppercase tracking-widest text-white">{activeStory.author}</p>
                                        </div>
                                    </div>
                                </header>

                                <div className="space-y-32">
                                    {activeStory.heroImage && (
                                        <div className="aspect-video rounded-[5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,1)]">
                                            <img src={activeStory.heroImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}

                                    <div className="max-w-4xl mx-auto space-y-24">
                                        {activeStory.sections && activeStory.sections.length > 0 ? (
                                            activeStory.sections.map((section, idx) => (
                                                <div key={section.id}>
                                                    {section.type === 'header' && <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic text-red-600 mt-40 mb-20 border-l-[16px] border-red-600 pl-16 leading-[0.8]">{section.content}</h3>}
                                                    {section.type === 'quote' && <div className="bg-white/5 border-l-[24px] border-white p-24 text-5xl md:text-7xl font-black uppercase italic tracking-tight text-white my-32 rounded-r-[5rem] shadow-2xl leading-[0.8]">{section.content}</div>}
                                                    {section.type === 'image' && <div className="rounded-[5rem] overflow-hidden border border-white/5 shadow-2xl my-40"><img src={section.content} className="w-full h-auto" alt="" /></div>}
                                                    {section.type === 'text' && (
                                                        <div className="relative">
                                                            {idx === 0 && (
                                                                <span className="float-left text-[15rem] md:text-[22rem] font-black italic leading-[0.6] pr-20 mr-10 mt-12 text-red-600 drop-shadow-2xl select-none">
                                                                    {section.content.charAt(0)}
                                                                </span>
                                                            )}
                                                            <p className="text-3xl md:text-5xl text-gray-300 font-medium leading-tight md:leading-[1.05] tracking-tighter">
                                                                {idx === 0 ? section.content.slice(1) : section.content}
                                                            </p>
                                                            <div className="clear-both"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="prose prose-invert max-w-none">
                                                <p className="text-3xl md:text-5xl text-gray-300 font-medium leading-tight md:leading-[1.05] tracking-tighter whitespace-pre-wrap">
                                                    {activeStory.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-64 border-t border-white/5 text-center flex flex-col items-center gap-16">
                                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-80 opacity-20 invert" alt="" />
                                    <p className="text-[16px] font-black text-gray-800 uppercase tracking-[3em] mr-[-3em]">WWW.CRATETV.NET</p>
                                </div>
                            </article>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => handleNavigate(null)} />
        </div>
    );
};

export default ZinePage;