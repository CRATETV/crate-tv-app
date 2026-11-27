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
import CardImage from './zine/CardImage';
import { isPublishedStory, readingMinutes, typeLabel } from '../api/_lib/zineRules';

// THE UNPACK: Crate TV's magazine. Light "paper" look, serif headlines,
// one cover story, a row of the latest, and shelves for the stories people
// love most (director's notes, the festivals).

const PAPER = 'bg-white';
const SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

const dateOf = (s: EditorialStory) => (s.publishedAt?.seconds ? new Date(s.publishedAt.seconds * 1000) : null);
const dateLabel = (s: EditorialStory) => dateOf(s)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || '';

// The tabs under the masthead. A tab only shows once it has a story in it.
const SECTIONS: { id: EditorialStory['type']; label: string; blurb: string }[] = [
    { id: 'SPOTLIGHT', label: 'Spotlight', blurb: 'Films and people we think you should know.' },
    { id: 'FILM_FEATURE', label: 'Film features', blurb: 'A closer look at films on Crate.' },
    { id: 'INTERVIEW', label: 'Interviews', blurb: 'Conversations with the people making the films.' },
    { id: 'DIRECTORS_NOTES', label: "Director's notes", blurb: 'Directors tell the story behind the film.' },
    { id: 'FESTIVAL_VOICES', label: 'From the festivals', blurb: 'The people behind our partner festivals, writing about the films and why they do this.' },
    { id: 'NEWS', label: 'News', blurb: "What's happening on Crate." },
    { id: 'DEEP_DIVE', label: 'Deep dives', blurb: 'The long reads.' },
];

const Kicker: React.FC<{ story: EditorialStory }> = ({ story }) => (
    <span style={{ fontFamily: SANS }} className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">{typeLabel(story.type)}</span>
);

const Byline: React.FC<{ story: EditorialStory }> = ({ story }) => (
    <p style={{ fontFamily: SANS }} className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
        By {story.author} <span className="mx-1.5 opacity-50">·</span> {readingMinutes(story)} min read
    </p>
);

const CoverStory: React.FC<{ story: EditorialStory; onOpen: () => void }> = ({ story, onOpen }) => (
    <article onClick={onOpen} className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        <div className="lg:col-span-7 relative overflow-hidden rounded-2xl bg-zinc-100 aspect-[16/10] lg:aspect-[16/9]">
            <CardImage src={story.heroImage} width={1400} zoom="duration-[1400ms] group-hover:scale-105" />
        </div>
        <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
                <span style={{ fontFamily: SANS }} className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm">Cover story</span>
                <Kicker story={story} />
            </div>
            <h2 style={{ fontFamily: SANS }} className="text-4xl md:text-5xl font-black leading-[1.02] tracking-tight text-zinc-950 group-hover:text-red-600 transition-colors">{story.title}</h2>
            {story.subtitle && <p style={{ fontFamily: SANS }} className="text-lg text-zinc-600 leading-snug line-clamp-3">{story.subtitle}</p>}
            <Byline story={story} />
            <span style={{ fontFamily: SANS }} className="inline-block bg-zinc-950 group-hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full transition-colors">Read the story →</span>
        </div>
    </article>
);

const StoryCard: React.FC<{ story: EditorialStory; onOpen: () => void }> = ({ story, onOpen }) => (
    <article onClick={onOpen} className="group cursor-pointer flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-xl bg-zinc-100 aspect-[16/10]">
            <CardImage src={story.heroImage} width={800} lazy zoom="duration-700 group-hover:scale-105" />
        </div>
        <div className="space-y-1.5">
            <Kicker story={story} />
            <h3 style={{ fontFamily: SANS }} className="text-xl font-extrabold leading-[1.15] tracking-tight text-zinc-950 group-hover:text-red-600 transition-colors">{story.title}</h3>
            {story.subtitle && <p style={{ fontFamily: SANS }} className="text-sm text-zinc-600 leading-snug line-clamp-2">{story.subtitle}</p>}
            <Byline story={story} />
        </div>
    </article>
);

const SectionHeading: React.FC<{ title: string; blurb?: string; onSeeAll?: () => void }> = ({ title, blurb, onSeeAll }) => (
    <div className="flex items-end justify-between gap-4 mb-5">
        <div>
            <h2 style={{ fontFamily: SANS }} className="text-2xl md:text-3xl font-black tracking-tight text-zinc-950 flex items-center gap-3">
                <span className="inline-block w-1.5 h-7 bg-red-600" aria-hidden="true" />{title}
            </h2>
            {blurb && <p style={{ fontFamily: SANS }} className="mt-1 text-sm md:text-base text-zinc-600">{blurb}</p>}
        </div>
        {onSeeAll && <button onClick={onSeeAll} style={{ fontFamily: SANS }} className="shrink-0 text-xs font-black uppercase tracking-widest text-zinc-950 hover:text-red-600">See all →</button>}
    </div>
);

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
    const filtered = useMemo(() => activeFilter === 'ALL' ? stories : stories.filter(s => s.type === activeFilter), [stories, activeFilter]);
    const presentTypes = useMemo(() => new Set(stories.map(s => s.type)), [stories]);
    // If the chosen tab has no stories (say one was taken down), fall back to Home.
    const view = activeFilter !== 'ALL' && presentTypes.has(activeFilter as EditorialStory['type']) ? activeFilter : 'ALL';
    const currentSection = SECTIONS.find(sec => sec.id === view);

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
                        <header className={`pt-28 md:pt-32 ${PAPER}`}>
                            <div className="max-w-[1300px] mx-auto px-6 text-center">
                                <p style={{ fontFamily: SANS }} className="text-[11px] font-black uppercase tracking-[0.35em] text-red-600">Crate TV presents</p>
                                <h1 style={{ fontFamily: SANS }} className="mt-3 text-[3rem] sm:text-7xl md:text-[6.5rem] font-black uppercase tracking-tighter leading-none text-zinc-950">The Unpack</h1>
                                <p style={{ fontFamily: SANS }} className="mt-4 text-base md:text-lg text-zinc-600 max-w-2xl mx-auto">Stories from the filmmakers and festivals on Crate TV.</p>
                            </div>
                            <nav aria-label="Sections" className="mt-8 border-y border-zinc-200">
                                <div className="max-w-[1300px] mx-auto px-6 flex md:justify-center gap-x-8 overflow-x-auto scrollbar-hide">
                                    {[{ id: 'ALL', label: 'Home' }, ...SECTIONS.filter(sec => presentTypes.has(sec.id)).map(sec => ({ id: sec.id as string, label: sec.label }))].map(tab => (
                                        <button key={tab.id} onClick={() => setActiveFilter(tab.id)} style={{ fontFamily: SANS }}
                                            className={`whitespace-nowrap py-4 text-sm font-bold border-b-[3px] -mb-px transition-colors ${view === tab.id ? 'text-zinc-950 border-red-600' : 'text-zinc-500 border-transparent hover:text-zinc-950'}`}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        </header>

                        {view === 'ALL' && nextPremiere && (
                            <UnpackCountdown movie={nextPremiere} onExplore={() => go(`/movie/${nextPremiere.key}`)} onRemindMe={() => newsletterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                        )}

                        {stories.length === 0 ? (
                            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
                                <p style={{ fontFamily: SANS }} className="text-3xl font-black tracking-tight text-zinc-800">The first issue is on its way.</p>
                                <p className="mt-4 text-zinc-500">Join the newsletter below and we will tell you the moment it is out.</p>
                            </div>
                        ) : view === 'ALL' ? (
                            <>
                                <section className="max-w-[1300px] mx-auto px-6 md:px-12 pt-10 pb-12">
                                    {cover && <CoverStory story={cover} onOpen={() => openStory(cover.id)} />}
                                </section>

                                {latest.length > 0 && (
                                    <section className="max-w-[1300px] mx-auto px-6 md:px-12 pb-12">
                                        <SectionHeading title="Just unpacked" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
                                            {latest.map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                        </div>
                                    </section>
                                )}

                                {SECTIONS.map(sec => {
                                    const list = stories.filter(s => s.type === sec.id && s.id !== cover?.id && !latest.some(l => l.id === s.id));
                                    if (!list.length) return null;
                                    return (
                                        <section key={sec.id} className="max-w-[1300px] mx-auto px-6 md:px-12 pb-12">
                                            <SectionHeading title={sec.label} blurb={sec.blurb} onSeeAll={() => setActiveFilter(sec.id)} />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
                                                {list.slice(0, 3).map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                            </div>
                                        </section>
                                    );
                                })}
                            </>
                        ) : (
                            <section className="max-w-[1300px] mx-auto px-6 md:px-12 pt-10 pb-12 min-h-[40vh]">
                                <SectionHeading title={currentSection?.label || ''} blurb={currentSection?.blurb} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                                    {filtered.map(s => <StoryCard key={s.id} story={s} onOpen={() => openStory(s.id)} />)}
                                </div>
                            </section>
                        )}

                        <section ref={newsletterRef} className="max-w-3xl mx-auto px-6 pb-12">
                            <div className="bg-zinc-100 text-zinc-950 p-8 md:p-10 text-center rounded-2xl">
                                <h2 style={{ fontFamily: SANS }} className="text-3xl md:text-4xl font-black tracking-tight">Get the next issue.</h2>
                                <p className="mt-2 text-zinc-600 text-base max-w-xl mx-auto">New stories, festival dates and watch party reveals, straight to your inbox.</p>
                                {subStatus === 'success' ? (
                                    <p className="mt-8 text-emerald-700 font-bold">You are on the list. Thank you!</p>
                                ) : (
                                    <form onSubmit={handleSubscribe} className="mt-5 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                                            className="flex-grow bg-white text-zinc-900 px-5 py-4 text-base outline-none border border-zinc-300 focus:ring-2 focus:ring-red-600" />
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
                                {/* Tall posters used to fill the whole width and push the story off the screen; now the picture never takes more than about half the height. */}
                                <img src={zineImg(activeStory.heroImage, 1800)} alt="" className="block mx-auto w-auto h-auto max-w-full max-h-[52vh] object-contain" />
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
                            <p className="mt-8 text-sm text-zinc-600">More stories on <a href="/zine" onClick={e => { e.preventDefault(); openStory(null); }} className="font-black text-zinc-900 underline decoration-red-600 underline-offset-4 hover:text-red-600">Crate TV</a>.</p>
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
