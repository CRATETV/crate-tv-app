
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';
import SEO from './SEO';
import { EditorialStory, ZineSection, Movie } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import ZineTrailerPark from './ZineTrailerPark';
import UnpackCountdown from './UnpackCountdown';

const ZineCard: React.FC<{ story: EditorialStory; onClick: () => void; tint: string }> = ({ story, onClick, tint }) => (
    <div
        onClick={onClick}
        className="group cursor-pointer flex flex-col gap-5 transition-all duration-500"
    >
        {/* Bigger, and tinted instead of flat bg-zinc-100 — every card in the
            grid gets a color backdrop now, not just the every-4th spotlight
            break, and the taller ratio gives imagery more room instead of
            a cropped-down landscape sliver. */}
        <div className={`relative overflow-hidden aspect-[4/5] rounded-2xl ${tint}`}>
            <img
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                alt=""
                crossOrigin="anonymous"
            />
        </div>
        <div className="space-y-2">
            <span className="text-red-600 font-black uppercase text-[9px] tracking-[0.2em]">
                {story.type || 'DISPATCH'}
            </span>
            <h3 className="font-black uppercase text-xl md:text-2xl text-zinc-900 leading-[0.95] tracking-tight group-hover:text-red-600 transition-colors">
                {story.title}
            </h3>
            <p className="text-zinc-500 text-sm font-medium line-clamp-2 leading-relaxed">
                {story.subtitle}
            </p>
            <span className="block pt-1 text-zinc-400 font-bold uppercase text-[10px] tracking-[0.15em]">
                By {story.author}
            </span>
        </div>
    </div>
);

// Pastel accent cycle for the spotlight breaks — bright, light, and airy
// instead of saturated/dark, so the page reads fresh rather than cinematic.
const SPOTLIGHT_COLORS = ['bg-indigo-200', 'bg-emerald-200', 'bg-amber-200', 'bg-rose-200'];
// Lighter version of the same palette for every regular grid card's image
// backdrop — was flat bg-zinc-100 for every card except the every-4th
// spotlight break, so 3 out of 4 cards had zero color at all.
const ZINE_CARD_TINTS = ['bg-indigo-50', 'bg-emerald-50', 'bg-amber-50', 'bg-rose-50'];

const ZineSpotlightCard: React.FC<{ story: EditorialStory; onClick: () => void; color: string }> = ({ story, onClick, color }) => (
    <div
        onClick={onClick}
        className={`group cursor-pointer col-span-full grid grid-cols-1 md:grid-cols-2 rounded-[2.5rem] overflow-hidden ${color}`}
    >
        <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
            <img
                src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                alt=""
                crossOrigin="anonymous"
            />
        </div>
        <div className="p-10 md:p-14 flex flex-col justify-center gap-4">
            <span className="text-zinc-700 font-black uppercase text-[9px] tracking-[0.3em]">
                {story.type || 'DISPATCH'}
            </span>
            <h3 className="font-black uppercase text-3xl md:text-4xl text-zinc-900 leading-[0.95] tracking-tight">
                {story.title}
            </h3>
            <p className="text-zinc-700 text-sm md:text-base font-medium leading-relaxed line-clamp-3">
                {story.subtitle}
            </p>
            <span className="pt-2 text-zinc-600 font-bold uppercase text-[10px] tracking-[0.15em]">
                By {story.author}
            </span>
        </div>
    </div>
);

const FeaturedZineCard: React.FC<{ story: EditorialStory; onClick: () => void }> = ({ story, onClick }) => (
    <div
        onClick={onClick}
        className="group cursor-pointer relative rounded-[3rem] overflow-hidden shadow-xl min-h-[420px] md:min-h-[560px] flex items-end"
    >
        <img
            src={`/api/proxy-image?url=${encodeURIComponent(story.heroImage)}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
            alt=""
            crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        <div className="relative z-10 p-8 md:p-16 space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white font-black uppercase text-[9px] tracking-[0.3em] px-3 py-1.5 rounded-full">Latest Dispatch</span>
                <span className="text-white/70 font-black uppercase text-[9px] tracking-[0.3em]">{story.type}</span>
            </div>
            <h2 className="text-fluid-title-lg font-black uppercase tracking-tighter text-white leading-[0.9]">
                {story.title}
            </h2>
            <p className="text-zinc-200 text-lg md:text-2xl max-w-2xl leading-snug hidden md:block">
                {story.subtitle}
            </p>
            <span className="block pt-2 text-zinc-300 font-bold uppercase text-[10px] tracking-[0.2em]">By {story.author}</span>
        </div>
    </div>
);

const ZinePage: React.FC<{ storyId?: string }> = ({ storyId }) => {
    const { zineStories: stories, movies, isLoading } = useFestival();
    const [activeStory, setActiveStory] = useState<EditorialStory | null>(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const articleRef = useRef<HTMLElement>(null);
    const newsletterRef = useRef<HTMLElement>(null);

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

    // Lead story gets the big hero treatment — only pull it out when browsing
    // "ALL" so filtered views (e.g. just INTERVIEW) still show every match
    // in the regular grid instead of hiding one inside the featured slot.
    const featuredStory = activeFilter === 'ALL' && filteredStories.length > 0 ? filteredStories[0] : null;
    const gridStories = featuredStory ? filteredStories.slice(1) : filteredStories;

    // Feed for "The Cinema Stage" — prefer films with an actual trailer clip,
    // then top up with poster-only titles (ZineTrailerPark's TrailerStage
    // already renders a graceful placeholder when a trailer is missing).
    const stageMovies = useMemo(() => {
        const all = (Object.values(movies || {}) as Movie[]).filter(m => !!m && !m.isUnlisted && !!m.poster);
        const withTrailer = all.filter(m => !!m.trailer);
        const withoutTrailer = all.filter(m => !m.trailer);
        return [...withTrailer, ...withoutTrailer].slice(0, 12);
    }, [movies]);

    // Countdown hero — the nearest upcoming release with a future releaseDateTime.
    // Feeds the same field the watch-party countdown already reads, so no new
    // admin field is needed to light this block up.
    const nextPremiere = useMemo(() => {
        const now = Date.now();
        const upcoming = (Object.values(movies || {}) as Movie[])
            .filter(m => !!m && !m.isUnlisted && !!m.poster && !!m.releaseDateTime && new Date(m.releaseDateTime).getTime() > now)
            .sort((a, b) => new Date(a.releaseDateTime!).getTime() - new Date(b.releaseDateTime!).getTime());
        return upcoming[0] || null;
    }, [movies]);

    const handleNavigate = (id: string | null) => {
        const path = id ? `/zine/${id}` : '/zine';
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0, 0);
    };

    const handleExploreMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleRemindMe = () => {
        newsletterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        <div className="flex flex-col min-h-screen text-zinc-900 bg-white selection:bg-red-600 selection:text-white relative overflow-x-hidden">
            <SEO
                title={activeStory ? activeStory.title : "The Unpack"}
                description={activeStory ? activeStory.subtitle : "Stay up to date with all that's happening at crate: watch parties, film festivals new releases."}
                image={activeStory?.heroImage}
                type={activeStory ? "article" : "website"}
            />

            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow pb-32 relative z-10">
                {!activeStory ? (
                    <div className="space-y-0">
                        <div className="relative pt-48 pb-20 px-6 md:px-20 overflow-hidden">
                            {/* Soft color wash — this was flat white before, the very
                                first thing on the page, with nothing but text on it.
                                Keeping the light theme (per your call) but giving it
                                actual color instead of a blank field. */}
                            <div className="absolute inset-0 -z-10 pointer-events-none">
                                <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-rose-200/50 rounded-full blur-[100px]" />
                                <div className="absolute -top-10 right-0 w-[380px] h-[380px] bg-indigo-200/50 rounded-full blur-[100px]" />
                                <div className="absolute top-40 left-1/3 w-[320px] h-[320px] bg-amber-200/40 rounded-full blur-[100px]" />
                            </div>
                            <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-8">
                                <div className="space-y-4">
                                    <span className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">The Editorial Hub</span>
                                    <h1 className="text-fluid-zine font-black uppercase tracking-tighter text-zinc-900 leading-[0.9]">
                                        The Unpack.
                                    </h1>
                                </div>
                                <p className="text-xl md:text-2xl text-zinc-500 font-medium max-w-2xl leading-snug">
                                    A curated dispatch on independent cinema, watch parties, and the distribution afterlife.
                                </p>
                            </div>
                        </div>

                        {nextPremiere && (
                            <div className="max-w-[1600px] mx-auto px-6 md:px-20 pb-24">
                                <UnpackCountdown
                                    movie={nextPremiere}
                                    onExplore={() => handleExploreMovie(nextPremiere)}
                                    onRemindMe={handleRemindMe}
                                />
                            </div>
                        )}

                        {/* THE CINEMA STAGE — trailer showcase, moved up near the
                            top so it feels alive even before any dispatches are
                            published, instead of buried below the whole grid. */}
                        {stageMovies.length > 0 && (
                            <section className="max-w-[1600px] mx-auto px-6 md:px-20 pb-24">
                                <ZineTrailerPark movies={stageMovies} />
                            </section>
                        )}

                        {featuredStory && (
                            <div className="max-w-[1600px] mx-auto px-6 md:px-20 pb-24">
                                <FeaturedZineCard story={featuredStory} onClick={() => handleNavigate(featuredStory.id)} />
                            </div>
                        )}

                        <div className="sticky top-[72px] z-40 py-6 bg-white/95 backdrop-blur-xl border-y border-zinc-100 flex items-center justify-center gap-6 md:gap-16 overflow-x-auto scrollbar-hide px-6">
                            {filters.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`whitespace-nowrap font-black uppercase text-[10px] tracking-[0.3em] transition-all ${activeFilter === f ? 'text-red-600' : 'text-zinc-400 hover:text-zinc-900'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-[1600px] mx-auto px-6 md:px-20 pt-24 pb-40">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-24">
                                {gridStories.length > 0 ? (
                                    gridStories.map((story, index) => {
                                        // Every 4th card breaks out into a full-bleed pastel
                                        // spotlight block, cycling accent colors, so the grid
                                        // doesn't read as one long uniform scroll.
                                        const isSpotlight = (index + 1) % 4 === 0;
                                        if (isSpotlight) {
                                            const color = SPOTLIGHT_COLORS[Math.floor(index / 4) % SPOTLIGHT_COLORS.length];
                                            return (
                                                <ZineSpotlightCard
                                                    key={story.id}
                                                    story={story}
                                                    color={color}
                                                    onClick={() => handleNavigate(story.id)}
                                                />
                                            );
                                        }
                                        return (
                                            <ZineCard
                                                key={story.id}
                                                story={story}
                                                tint={ZINE_CARD_TINTS[index % ZINE_CARD_TINTS.length]}
                                                onClick={() => handleNavigate(story.id)}
                                            />
                                        );
                                    })
                                ) : !featuredStory ? (
                                    <div className="col-span-full py-48 text-center opacity-40">
                                        <p className="text-zinc-400 uppercase font-black tracking-[0.5em] text-xs">No records found.</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <section ref={newsletterRef} className="max-w-6xl mx-auto px-6 pb-60">
                            <div className="relative p-[1px] bg-gradient-to-r from-red-500 via-purple-500 to-emerald-500 rounded-[4rem] shadow-lg">
                                <div className="bg-white rounded-[4rem] p-12 md:p-24 text-center space-y-12 relative overflow-hidden">
                                    <div className="relative z-10 space-y-4">
                                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-zinc-900">Join the Newsletter.</h2>
                                        <p className="text-zinc-500 text-lg md:text-2xl font-medium max-w-2xl mx-auto leading-tight">Direct access to festival maps and live watch party reveals.</p>
                                    </div>

                                    {subStatus === 'success' ? (
                                        <div className="bg-green-50 border border-green-200 p-10 rounded-3xl inline-block px-20">
                                            <p className="text-green-700 font-black uppercase text-sm tracking-[0.5em]">CONNECTION ESTABLISHED ✓</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row gap-4 max-w-xl mx-auto relative z-10">
                                            <input
                                                type="email"
                                                placeholder="EMAIL ADDRESS"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-grow bg-zinc-50 border-2 border-zinc-200 p-6 rounded-2xl text-zinc-900 text-lg outline-none focus:border-red-600 transition-all font-black uppercase tracking-widest placeholder:text-zinc-400 shadow-inner"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={subStatus === 'loading'}
                                                className="bg-zinc-900 text-white font-black py-6 px-12 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
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
                    <div className="animate-[fadeIn_0.8s_ease-out] bg-white">
                        <div className="max-w-[1400px] mx-auto px-6 pt-40 pb-20">
                            <button onClick={() => handleNavigate(null)} className="flex items-center gap-3 text-zinc-400 hover:text-zinc-900 transition-all uppercase font-black text-[10px] tracking-[0.3em] mb-12">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Archive
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                                <div className="lg:col-span-7 space-y-10">
                                    <div className="space-y-6">
                                        <span className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">{activeStory.type}</span>
                                        <h1 className="text-fluid-zine font-black uppercase tracking-tight text-zinc-900 leading-[0.95]">{activeStory.title}</h1>
                                        <p className="text-fluid-sub text-zinc-500 leading-snug">"{activeStory.subtitle}"</p>
                                    </div>
                                    <div className="flex items-center gap-6 pt-6 border-t border-zinc-200">
                                        <div className="space-y-1">
                                            <p className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Written By</p>
                                            <p className="text-zinc-900 font-black uppercase text-sm tracking-[0.2em]">{activeStory.author}</p>
                                        </div>
                                        <div className="w-px h-8 bg-zinc-200"></div>
                                        <div className="space-y-1">
                                            <p className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Published</p>
                                            <p className="text-zinc-900 font-black uppercase text-sm tracking-[0.2em]">{activeStory.publishedAt?.seconds ? new Date(activeStory.publishedAt.seconds * 1000).toLocaleDateString() : 'Active Record'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-5">
                                    <div className="aspect-[4/5] bg-zinc-100 overflow-hidden shadow-xl rounded-2xl">
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
                                            {section.type === 'header' && <h3 className="text-3xl md:text-5xl font-black text-zinc-900 mb-8 leading-tight">{section.content}</h3>}
                                            {section.type === 'quote' && (
                                                <div className="py-12 border-y border-zinc-200 my-16">
                                                    <p className="text-2xl md:text-4xl font-serif italic text-zinc-900 leading-tight text-center max-w-2xl mx-auto">
                                                        "{section.content}"
                                                    </p>
                                                </div>
                                            )}
                                            {section.type === 'image' && (
                                                <div className="my-16">
                                                    <img src={`/api/proxy-image?url=${encodeURIComponent(section.content)}`} className="w-full h-auto rounded-2xl shadow-lg" alt="" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            {section.type === 'video' && (
                                                <div className="my-16 aspect-video bg-zinc-100 rounded-2xl overflow-hidden shadow-lg">
                                                    <video src={section.content} controls className="w-full h-full object-cover" playsInline />
                                                </div>
                                            )}
                                            {section.type === 'text' && (
                                                <p className="text-lg md:text-xl text-zinc-700 font-medium leading-relaxed mb-8">
                                                    {section.content}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="prose max-w-none">
                                        <p className="text-lg md:text-xl text-zinc-700 font-medium leading-relaxed whitespace-pre-wrap">
                                            {activeStory.content}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-40 pt-32 border-t border-zinc-200 text-center flex flex-col items-center gap-16">
                                <img src="https://d3jhtrl1gnrh4b.cloudfront.net/logo+with+background+removed+.png" className="w-72 opacity-80" alt="Crate TV" />
                                <div className="space-y-10">
                                    <button onClick={() => handleNavigate(null)} className="bg-zinc-900 text-white font-black px-24 py-8 rounded-[3rem] uppercase tracking-[0.5em] text-sm hover:bg-red-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg">Return to Hub</button>
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
