import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, Movie } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import UnpackCountdown from './UnpackCountdown';
import ZineArticleBody, { zineImg, SERIF } from './zine/ZineArticleBody';
import { isPublishedStory, readingMinutes, typeLabel } from '../api/_lib/zineRules';

// THE UNPACK: Crate TV's magazine. Light "paper" look, serif headlines,
// one cover story, a row of the latest, and shelves for the stories people
// love most (director's notes, the festivals).

const PAPER = 'bg-[#faf6ef]';

const dateOf = (s: EditorialStory) => (s.publishedAt?.seconds ? new Date(s.publishedAt.seconds * 1000) : null);
const dateLabel = (s: EditorialStory) => dateOf(s)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || '';

const Kicker: React.FC<{ story: EditorialStory; light?: boolean }> = ({ story, light }) => (
    <span className={`text-[11px] font-black uppercase tracking-[0.25em] ${light ? 'text-red-300' : 'text-red-600'}`}>{typeLabel(story.type)}</span>
);

const Byline: React.FC<{ story: EditorialStory; light?: boolean }> = ({ story, light }) => (
    <p className={`text-xs font-bold uppercase tracking-[0.15em] ${light ? 'text-zinc-300' : 'text-zinc-500'}`}>
        By {story.author} <span className="mx-1.5 opacity-50">·</span> {readingMinutes(story)} min read
    </p>
);

const CoverStory: React.FC<{ story: EditorialStory; onOpen: () => void }> = ({ story, onOpen }) => (
    <article onClick={onOpen} className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        <div className="lg:col-span-7 overflow-hidden bg-zinc-200 aspect-[16/10] lg:aspect-[16/9]">
            <img src={zineImg(story.heroImage, 1400)} alt="" className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
        </div>
        <div className="lg:col-span-5 space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5">Cover story</span>
                <Kicker story={story} />
            </div>
            <h2 style={{ fontFamily: SERIF }} className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold leading-[1.05] text-zinc-900 group-hover:text-red-700 transition-colors">{story.title}</h2>
            {story.subtitle && <p style={{ fontFamily: SERIF }} className="text-lg md:text-xl italic text-zinc-600 leading-snug line-clamp-3">{story.subtitle}</p>}
            <Byline story={story} />
            <span className="inline-block text-sm font-black uppercase tracking-widest text-zinc-900 border-b-2 border-red-600 pb-1">Read the story →</span>
        </div>
    </article>
);

const StoryCard: React.FC<{ story: EditorialStory; onOpen: () => void }> = ({ story, onOpen }) => (
    <article onClick={onOpen} className="group cursor-pointer flex flex-col gap-3">
        <div className="overflow-hidden bg-zinc-200 aspect-[16/10]">
            <img src={zineImg(story.heroImage, 800)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        <div className="space-y-1.5">
            <Kicker story={story} />
            <h3 style={{ fontFamily: SERIF }} className="text-[1.3rem] font-bold leading-[1.12] text-zinc-900 group-hover:text-red-700 transition-colors">{story.title}</h3>
            {story.subtitle && <p className="text-sm text-zinc-600 leading-snug line-clamp-2">{story.subtitle}</p>}
            <Byline story={story} />
        </div>
    </article>
);

const Shelf: React.FC<{ title: string; blurb: string; stories: EditorialStory[]; onOpen: (id: string) => void; dark?: boolean }> = ({ title, blurb, stories, onOpen, dark }) => {
    if (!stories.length) return null;
    return (
        <section className={dark ? 'bg-zinc-900 text-white' : PAPER}>
            <div className="max-w-[1300px] mx-auto px-6 md:px-12 py-10 md:py-12">
                <div className="mb-6 md:mb-8">
                    <h2 style={{ fontFamily: SERIF }} className={`text-3xl md:text-4xl font-bold italic ${dark ? 'text-white' : 'text-zinc-900'}`}>{title}</h2>
                    <p className={`mt-1 text-base ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>{blurb}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                    {stories.slice(0, 3).map(s => (
                        <article key={s.id} onClick={() => onOpen(s.id)} className="group cursor-pointer flex flex-col gap-3">
                            <div className="overflow-hidden aspect-[16/10] bg-zinc-800">
                                <img src={zineImg(s.heroImage, 800)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <h3 style={{ fontFamily: SERIF }} className={`text-xl font-bold leading-tight ${dark ? 'text-white group-hover:text-red-300' : 'text-zinc-900 group-hover:text-red-700'} transition-colors`}>{s.title}</h3>
                            {s.subtitle && <p className={`text-[15px] line-clamp-2 ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>{s.subtitle}</p>}
                            <Byline story={s} light={dark} />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FILTERS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All stories' },
    { id: 'FILM_FEATURE', label: 'Film features' },
    { id: 'DIRECTORS_NOTES', label: "Director's notes" },
    { id: 'INTERVIEW', label: 'Interviews' },
    { id: 'FESTIVAL_VOICES', label: 'From the festivals' },
    { id: 'NEWS', label: 'News' },
    { id: 'SPOTLIGHT', label: 'Spotlight' },
    { id: 'DEEP_DIVE', label: 'Deep dives' },
];

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const { zineStories, movies, isLoading } = useFestival();
    // Drafts never show to readers, even if one slips into the data.
    const stories = useMemo(() => zineStories.filter(isPublishedStory), [zineStories]);
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [copied, setCopied] = useState(false);
    const [progress, setProgress] = useState(0);
    const articleRef = useRef<HTMLElement>(null);
    const newsletterRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (storyId && stories.length > 0) setActiveStory(stories.find(s => s.id === storyId) || null);
        else setActiveStory(null);
    }, [storyId, stories]);

    // Reading progress bar on a story.
    useEffect(() => {
        if (!activeStory) { setProgress(0); return; }
        const onScroll = () => {
            const el = articleRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const total = rect.height - window.innerHeight * 0.6;
            setProgress(Math.min(100, Math.max(0, total > 0 ? (-rect.top / total) * 100 : 0)));
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [activeStory]);

    const [cover, ...rest] = stories;
    const latest = rest.slice(0, 3);
    const byType = (t: string) => stories.filter(s => s.type === t && s.id !== cover?.id && !latest.some(l => l.id === s.id));
    const directorShelf = byType('DIRECTORS_NOTES');
    const festivalShelf = byType('FESTIVAL_VOICES');
    const filtered = useMemo(() => activeFilter === 'ALL' ? stories : stories.filter(s => s.type === activeFilter), [stories, activeFilter]);
    const presentTypes = useMemo(() => new Set(stories.map(s => s.type)), [stories]);

    const nextPremiere = useMemo(() => {
        const now = Date.now();
        return (Object.values(movies || {}) as Movie[])
            .filter(m => !!m && !m.isUnlisted && !!m.poster && !!m.releaseDateTime && new Date(m.releaseDateTime).getTime() > now)
            .sort((a, b) => new Date(a.releaseDateTime!).getTime() - new Date(b.releaseDateTime!).getTime())[0] || null;
    }, [movies]);

    const go = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };
    const openStory = (id: string | null) => go(id ? `/zine/${id}` : '/zine');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubStatus('loading');
        try {
            const res = await fetch('/api/subscribe-newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase().trim() }) });
            if (res.ok) { setSubStatus('success'); setEmail(''); } else setSubStatus('idle');
        } catch { setSubStatus('idle'); }
    };

    const shareStory = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) { await navigator.share({ title: activeStory?.title, url }); return; }
            await navigator.clipboard.writeText(url);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        } catch { /* cancelled or blocked: nothing to do */ }
    };

    if (isLoading) return <LoadingSpinner />;

    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const moreToRead = activeStory ? stories.filter(s => s.id !== activeStory.id).sort((a, b) => Number(b.type === activeStory.type) - Number(a.type === activeStory.type)).slice(0, 3) : [];

    return (
        <div className={`flex flex-col min-h-screen text-zinc-900 ${PAPER} selection:bg-red-600 selection:text-white relative overflow-x-hidden`}>
            <SEO
                title={activeStory ? activeStory.title : 'The Unpack'}
                description={activeStory ? activeStory.subtitle : 'Stories, interviews and notes from the filmmakers and festivals on Crate TV.'}
                image={activeStory?.heroImage}
                type={activeStory ? 'article' : 'website'}
            />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            {activeStory && <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent"><div className="h-full bg-red-600 transition-[width] duration-100" style={{ width: `${progress}%` }} /></div>}

            <main className="flex-grow pb-24 relative z-10">
                {!activeStory ? (
                    <>
                        {/* Masthead */}
                        <header className={`pt-28 md:pt-32 pb-6 px-6 ${PAPER}`}>
                            <div className="max-w-[1300px] mx-auto">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 pb-4 border-b-2 border-zinc-900">
                                    <span className="flex items-center gap-2">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                                            <path d="M3 9h18v11H3z" />
                                            <path d="M3 13h18M3 17h18" />
                                            <path d="M3 9l2-5h14l2 5" />
                                        </svg>
                                        Crate TV presents
                                    </span>
                                    <span className="hidden sm:inline">{month}</span>
                                    <span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
                                </div>
                                <h1 style={{ fontFamily: SERIF }} className="text-center text-[3.6rem] sm:text-[5.5rem] md:text-[7.5rem] font-black italic leading-[1] tracking-tight text-zinc-900 pt-3 md:pt-4 pb-3 md:pb-4">The Unpack</h1>
                                <p style={{ fontFamily: SERIF }} className="text-center text-base md:text-lg italic text-zinc-600 pb-4 max-w-2xl mx-auto">What's inside this week.</p>
                                <div className="border-t border-zinc-900 border-b-4 border-double h-2" />
                            </div>
                        </header>

                        {nextPremiere && (
                            <UnpackCountdown movie={nextPremiere} onExplore={() => go(`/movie/${nextPremiere.key}`)} onRemindMe={() => newsletterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                        )}

                        {stories.length === 0 ? (
                            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                                <p style={{ fontFamily: SERIF }} className="text-3xl italic text-zinc-700">The first issue is on its way.</p>
                                <p className="mt-4 text-zinc-500">Join the newsletter below and we will tell you the moment it is out.</p>
                            </div>
                        ) : (
                            <>
                                <section className="max-w-[1300px] mx-auto px-6 md:px-12 pt-8 pb-10">
                                    {cover && <CoverStory story={cover} onOpen={() => openStory(cover.id)} />}
                                </section>

                                {latest.length > 0 && (
                                    <section className="max-w-[1300px] mx-auto px-6 md:px-12 pb-10">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-900 border-t-2 border-zinc-900 pt-3 mb-5">Just unpacked</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                                            {latest.map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                        </div>
                                    </section>
                                )}

                                <Shelf title="In their own words" blurb="Directors tell the story behind the film." stories={directorShelf} onOpen={openStory} dark />
                                <Shelf title="From the festivals" blurb="The people behind our partner festivals, writing about the films and why they do this." stories={festivalShelf} onOpen={openStory} />
                            </>
                        )}

                        {stories.length > 3 && (
                            <section className="max-w-[1300px] mx-auto px-6 md:px-12 pt-10 pb-12">
                                <p style={{ fontFamily: SERIF }} className="text-3xl font-bold italic mb-4 border-t-2 border-zinc-900 pt-4">From the crate</p>
                                <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
                                    {FILTERS.filter(f => f.id === 'ALL' || presentTypes.has(f.id as EditorialStory['type'])).map(f => (
                                        <button key={f.id} onClick={() => setActiveFilter(f.id)}
                                            className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-colors ${activeFilter === f.id ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600 hover:border-zinc-900'}`}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                                    {filtered.map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                </div>
                            </section>
                        )}

                        <section ref={newsletterRef} className="max-w-3xl mx-auto px-6 pb-12">
                            <div className="bg-zinc-900 text-white p-8 md:p-10 text-center">
                                <h2 style={{ fontFamily: SERIF }} className="text-3xl md:text-4xl font-bold italic">Get the next issue.</h2>
                                <p className="mt-2 text-zinc-400 text-base max-w-xl mx-auto">New stories, festival dates and watch party reveals, straight to your inbox.</p>
                                {subStatus === 'success' ? (
                                    <p className="mt-8 text-emerald-300 font-bold">You are on the list. Thank you!</p>
                                ) : (
                                    <form onSubmit={handleSubscribe} className="mt-5 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                                            className="flex-grow bg-white text-zinc-900 px-5 py-4 text-base outline-none focus:ring-2 focus:ring-red-600" />
                                        <button type="submit" disabled={subStatus === 'loading'} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs px-8 py-4 disabled:opacity-50">
                                            {subStatus === 'loading' ? 'Joining…' : 'Subscribe'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="animate-[fadeIn_0.6s_ease-out]">
                        <div className="max-w-[860px] mx-auto px-6 pt-36 md:pt-44">
                            <button onClick={() => openStory(null)} className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-900 mb-10">← The Unpack</button>
                            <p className="mb-5"><Kicker story={activeStory} /></p>
                            <h1 style={{ fontFamily: SERIF }} className="text-[2.6rem] sm:text-6xl md:text-7xl font-black leading-[1.02] text-zinc-900">{activeStory.title}</h1>
                            {activeStory.subtitle && <p style={{ fontFamily: SERIF }} className="mt-6 text-2xl md:text-3xl italic text-zinc-600 leading-snug">{activeStory.subtitle}</p>}
                            <div className="mt-8 pt-5 border-t border-zinc-300 flex flex-wrap items-center gap-x-6 gap-y-2">
                                <p className="text-sm text-zinc-900"><span className="text-zinc-500">By</span> <span className="font-black">{activeStory.author}</span></p>
                                {dateLabel(activeStory) && <p className="text-sm text-zinc-500">{dateLabel(activeStory)}</p>}
                                <p className="text-sm text-zinc-500">{readingMinutes(activeStory)} min read</p>
                            </div>
                        </div>

                        {activeStory.heroImage && (
                            <figure className="max-w-[1200px] mx-auto px-0 md:px-6 mt-10">
                                <img src={zineImg(activeStory.heroImage, 1800)} alt="" className="w-full h-auto" />
                            </figure>
                        )}

                        <article ref={articleRef} className="max-w-[720px] mx-auto px-6 mt-14 pb-20">
                            {activeStory.sections && activeStory.sections.length > 0 ? (
                                <ZineArticleBody sections={activeStory.sections} movies={movies as Record<string, Movie>} onOpenFilm={key => go(`/movie/${key}`)} />
                            ) : (
                                <p style={{ fontFamily: SERIF }} className="text-[1.25rem] leading-[1.75] text-zinc-800 whitespace-pre-wrap">{activeStory.content}</p>
                            )}

                            <div className="mt-16 pt-8 border-t-2 border-zinc-900 flex flex-wrap items-center justify-between gap-4">
                                <p className="text-sm text-zinc-600">{activeStory.partnerName ? <>Written for The Unpack by <strong className="text-zinc-900">{activeStory.author}</strong> of {activeStory.partnerName}.</> : <>Written by <strong className="text-zinc-900">{activeStory.author}</strong>.</>}</p>
                                <button onClick={shareStory} className="bg-zinc-900 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-full transition-colors">{copied ? 'Link copied' : 'Share this story'}</button>
                            </div>
                        </article>

                        {moreToRead.length > 0 && (
                            <section className="bg-white border-t border-zinc-200">
                                <div className="max-w-[1300px] mx-auto px-6 md:px-12 py-16">
                                    <h2 style={{ fontFamily: SERIF }} className="text-3xl md:text-4xl font-bold italic mb-10">Keep reading</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
                                        {moreToRead.map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => openStory(null)} />
        </div>
    );
};

export default ZinePage;
