import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFestival } from '../contexts/FestivalContext';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import MovieCarousel from './MovieCarousel';
import { Movie, Category, HeroConfig } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import AuthModal from './AuthModal';
import Footer from './Footer';
import SEO from './SEO';
import { HERO_DEFAULTS } from './HeroEditor';
import UpcomingWatchParties from './UpcomingWatchParties';
import { topTen } from '../api/_lib/topTen';

const ReasonCard: React.FC<{ title: string; desc: string; icon: string }> = ({ title, desc, icon }) => (
    <div className="relative p-[1px] bg-gradient-to-br from-red-600 via-purple-600 to-indigo-600 rounded-[2.5rem] shadow-2xl group transition-all duration-700 hover:shadow-[0_20px_80px_rgba(239,68,68,0.2)] hover:-translate-y-2">
        <div className="bg-[#050505] p-10 rounded-[2.5rem] flex flex-col justify-between min-h-[320px] relative overflow-hidden h-full">
            <div className="space-y-4 relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none italic">{title}</h3>
                <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed">{desc}</p>
            </div>
            <div className="absolute bottom-6 right-6 text-6xl opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                {icon}
            </div>
        </div>
    </div>
);

// Counts up from 0 to `value` once it scrolls into view, easing out so it
// settles rather than ticking to a stop.
const AnimatedStat: React.FC<{ value: number; suffix?: string; label: string; plainNumber?: boolean }> = ({ value, suffix = '', label, plainNumber = false }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [displayValue, setDisplayValue] = useState(0);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || hasAnimated.current) return;
            hasAnimated.current = true;
            const duration = 1400;
            const start = performance.now();
            const step = (now: number) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setDisplayValue(Math.round(value * eased));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.4 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [value]);

    return (
        <div ref={ref} className="text-center space-y-3">
            <p className="text-5xl md:text-7xl font-black italic text-white tracking-tighter">
                {plainNumber ? displayValue : displayValue.toLocaleString()}{suffix}
            </p>
            <p className="text-gray-500 font-black uppercase text-[10px] md:text-xs tracking-[0.3em]">{label}</p>
        </div>
    );
};

// Infinite-scrolling strip of film titles — the content is duplicated once
// so the CSS animation can loop seamlessly at the halfway point.
const Marquee: React.FC<{ items: string[] }> = ({ items }) => {
    if (items.length === 0) return null;
    const track = [...items, ...items];
    return (
        <div className="relative overflow-hidden border-y border-white/10 bg-black py-5">
            <div className="flex whitespace-nowrap animate-marquee w-max">
                {track.map((title, i) => (
                    <span key={i} className="mx-8 flex items-center gap-8 text-lg md:text-2xl font-black uppercase italic tracking-tight text-white/70">
                        {title}
                        <span className="text-red-600">★</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

const FaqItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-8 flex justify-between items-center text-left group"
            >
                <span className="text-xl md:text-2xl font-bold text-white group-hover:text-red-500 transition-colors">{question}</span>
                <span className={`text-3xl transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 pb-8' : 'max-h-0'}`}>
                <div className="text-gray-400 text-lg md:text-xl leading-relaxed space-y-4">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const { movies: liveMovies, festivalData: liveFestivalData, allPartyStates: liveAllPartyStates } = useFestival();
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
    const [festivalData, setFestivalData] = useState<any[]>([]);
    const [hero, setHero] = useState<Required<HeroConfig>>(HERO_DEFAULTS);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setFestivalData((data as any).festivalData || []);
                if ((data as any).viewCounts) setViewCounts((data as any).viewCounts);
                const heroConfig = (data as any).settings?.heroConfig;
                if (heroConfig) setHero({ ...HERO_DEFAULTS, ...heroConfig });
            } catch (error) {
                console.error("Landing Load Fail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const modernPosters = useMemo(() => {
        const vintageKeys = new Set(categories.publicDomainIndie?.movieKeys || []);
        return (Object.values(movies) as Movie[])
            .filter(m => !!m.poster && !vintageKeys.has(m.key))
            .map(m => m.poster)
            .slice(0, 24);
    }, [movies, categories]);

    // Three rows for the moving poster wall (repeats posters when the catalog is small).
    const posterRows = useMemo(() => {
        if (!modernPosters.length) return [[], [], []] as string[][];
        const fill = (offset: number) => Array.from({ length: Math.max(10, Math.ceil(modernPosters.length / 3)) }, (_, i) => modernPosters[(offset + i) % modernPosters.length]);
        return [fill(0), fill(Math.ceil(modernPosters.length / 3)), fill(Math.ceil((2 * modernPosters.length) / 3))];
    }, [modernPosters]);

    const topTenMovies = useMemo(() => {
        return topTen(Object.values(movies) as Movie[], viewCounts, Date.now());
    }, [movies, viewCounts]);

    const marqueeTitles = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m.title && !m.isUnlisted)
            .map(m => m.title)
            .slice(0, 20);
    }, [movies]);

    const totalFilmCount = useMemo(() => Object.keys(movies).length, [movies]);

    const openAuthModal = (view: 'login' | 'signup') => {
        setInitialAuthView(view);
        setIsAuthModalOpen(true);
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505] selection:bg-red-600">
            <SEO title="Stream Independent" description="The distribution afterlife for independent cinema. Watch for free, support creators directly." />
            
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={false}
                onMobileSearchClick={() => {}}
                showSearch={false}
                onSignInClick={() => openAuthModal('login')}
                showNavLinks={false}
            />
            
            <main className="flex-grow">
                {/* Watch parties come FIRST: upcoming ones with a countdown and
                    ticket button, live ones with "Join now" (Oct 26 2026). Uses
                    the live site data so a party shows the moment it's saved. */}
                <UpcomingWatchParties movies={liveMovies} festivalData={liveFestivalData} allPartyStates={liveAllPartyStates} className="px-4 md:px-12 pt-24 md:pt-28 pb-4 bg-black max-w-[1800px] mx-auto" />
                {/* SECTION 1: HERO — Oct 2026 redesign: moving poster wall, brand-gradient
                    headline, top-3 film stack, one-bar email signup. Words still come from
                    Admin → Homepage (hero settings). */}
                <section className="relative min-h-[100svh] flex items-center overflow-hidden border-b border-white/10 pt-24 pb-16 md:pt-20">
                    {/* Moving poster wall */}
                    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
                        <div className="absolute -inset-x-40 -inset-y-24 flex flex-col justify-center gap-5 opacity-[0.38]"
                            style={{ transform: 'perspective(1400px) rotateX(14deg) rotateZ(-7deg) scale(1.15)' }}>
                            {[0, 1, 2].map(row => {
                                const list = posterRows[row];
                                if (!list.length) return null;
                                return (
                                    <div key={row} className="flex w-max gap-5 animate-marquee hero-wall-row"
                                        style={{ animationDuration: `${90 + row * 25}s`, animationDirection: row % 2 ? 'reverse' : 'normal' }}>
                                        {[...list, ...list].map((url, i) => (
                                            <div key={i} className="w-[150px] md:w-[190px] aspect-[2/3] rounded-2xl overflow-hidden bg-[#141418] shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 flex-shrink-0">
                                                <img src={url} className="w-full h-full object-cover" alt="" loading={i < 8 ? 'eager' : 'lazy'} />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Light, colour and vignette */}
                    <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden
                        style={{ background: 'radial-gradient(60% 55% at 22% 42%, rgba(255,59,92,0.28), transparent 70%), radial-gradient(50% 50% at 85% 70%, rgba(123,77,255,0.26), transparent 70%), radial-gradient(40% 40% at 70% 10%, rgba(255,154,60,0.14), transparent 70%)' }} />
                    <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[#050505] via-[#050505]/80 to-[#050505]/30" aria-hidden />
                    <div className="absolute inset-x-0 bottom-0 h-48 z-10 pointer-events-none bg-gradient-to-t from-[#050505] to-transparent" aria-hidden />
                    <div className="absolute inset-x-0 top-0 h-32 z-10 pointer-events-none bg-gradient-to-b from-[#050505] to-transparent" aria-hidden />

                    <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 md:px-12 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-8 items-center animate-[fadeIn_1s_ease-out]">
                        {/* Words + signup */}
                        <div className="text-center lg:text-left space-y-8 md:space-y-10">
                            <div className="inline-flex items-center gap-3 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/15 pl-3 pr-5 py-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF9A3C] opacity-75 animate-ping" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF9A3C]" />
                                </span>
                                <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.25em] text-white/90">{hero.eyebrow}</span>
                            </div>

                            <h1 className="font-black uppercase tracking-tighter leading-[0.84] text-[clamp(3.6rem,15vw,9.5rem)]">
                                <span className="block text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.8)]">{hero.headlineLine1}</span>
                                <span className="block bg-clip-text text-transparent pb-2"
                                    style={{ backgroundImage: 'linear-gradient(92deg, #FF9A3C 0%, #FF3B5C 32%, #D63BD9 66%, #7B4DFF 100%)' }}>
                                    {hero.headlineLine2}
                                </span>
                            </h1>

                            <p className="text-xl md:text-3xl text-white/85 font-medium max-w-2xl mx-auto lg:mx-0 leading-snug tracking-tight">
                                {hero.subheadline}
                            </p>

                            <div className="w-full max-w-xl mx-auto lg:mx-0">
                                <p className="text-sm md:text-base text-white/60 mb-3">{hero.emailPromptText}</p>
                                <form onSubmit={(e) => { e.preventDefault(); openAuthModal('signup'); }}
                                    className="relative flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center rounded-[1.4rem] sm:rounded-full p-2 bg-black/55 backdrop-blur-xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.55)] focus-within:border-white/40 transition-colors">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Your email address"
                                        aria-label="Email address"
                                        className="flex-grow bg-transparent px-5 py-4 text-white text-lg placeholder:text-white/40 outline-none"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-full px-8 py-4 text-[#0B0B0D] font-black text-lg tracking-tight transition-all hover:brightness-110 hover:scale-[1.03] active:scale-95 shadow-[0_12px_40px_rgba(255,255,255,0.18)] whitespace-nowrap"
                                        style={{ backgroundImage: 'linear-gradient(180deg, #FFFFFF, #E9E9EE)' }}
                                    >
                                        {hero.ctaButtonText} →
                                    </button>
                                </form>
                                <ul className="mt-5 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-white/65">
                                    <li className="flex items-center gap-2"><span className="text-[#1FCB7A]">●</span> Free to watch</li>
                                    <li className="flex items-center gap-2"><span className="text-[#3BB2FF]">●</span> Web, Roku &amp; Chromecast</li>
                                    <li className="flex items-center gap-2"><span className="text-[#FFC53D]">●</span> 70% goes to filmmakers</li>
                                </ul>
                            </div>
                        </div>

                        {/* Top 3 right now (desktop) */}
                        {topTenMovies.length >= 3 && (
                            <div className="hidden lg:block relative h-[560px]" aria-label="Most watched right now">
                                <p className="absolute -top-2 right-6 text-[11px] font-black uppercase tracking-[0.25em] text-white/60">Most watched right now</p>
                                {topTenMovies.slice(0, 3).map((m, i) => {
                                    const pos = [
                                        { left: '22%', top: '8%', rot: -2, z: 30, w: 265 },
                                        { left: '0%', top: '24%', rot: -9, z: 10, w: 205 },
                                        { left: '62%', top: '22%', rot: 8, z: 20, w: 205 },
                                    ][i];
                                    return (
                                        <button key={m.key} onClick={() => openAuthModal('signup')}
                                            className="hero-float absolute rounded-[1.6rem] overflow-hidden ring-1 ring-white/20 shadow-[0_40px_90px_rgba(0,0,0,0.75)] transition-transform duration-500 hover:scale-[1.04] hover:z-40 group"
                                            style={{ left: pos.left, top: pos.top, width: pos.w, zIndex: pos.z, transform: `rotate(${pos.rot}deg)`, animationDelay: `${i * 1.3}s` }}
                                            aria-label={`${m.title} — sign up to watch`}>
                                            <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                                            <span className="absolute inset-x-0 bottom-0 p-4 pt-14 bg-gradient-to-t from-black/90 to-transparent text-left opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="block text-white text-sm font-bold">Sign up free to watch →</span>
                                            </span>
                                            <span className={`absolute top-3 ${i === 2 ? 'right-3' : 'left-3'} min-w-[38px] h-[38px] px-2 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg`}
                                                style={{ backgroundImage: 'linear-gradient(135deg, #FF9A3C, #FF3B5C)' }}>{i + 1}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <a href="#crate-top-ten" className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex-col items-center gap-2 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-[0.3em]" aria-label="Scroll down">
                        Explore
                        <span className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />
                    </a>
                </section>

                {/* SECTION 1.5: TITLE MARQUEE */}
                <Marquee items={marqueeTitles} />

                {/* SECTION 1.6: BY THE NUMBERS */}
                <section className="py-24 px-6 bg-[#050505]">
                    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
                        <AnimatedStat value={totalFilmCount} suffix="+" label="Films Streaming" />
                        <AnimatedStat value={70} suffix="%" label="Goes To Filmmakers" />
                        <AnimatedStat value={3} label="Ways To Watch — Web, Roku, Cast" />
                        <AnimatedStat value={2022} label="Founded" plainNumber />
                    </div>
                </section>

                {/* SECTION 2: TOP 10 */}
                {topTenMovies.length > 0 && (
                    <section id="crate-top-ten" className="py-32 px-4 md:px-12 bg-black">
                        <div className="max-w-[1800px] mx-auto">
                            <MovieCarousel 
                                title={
                                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-8 border-l-8 border-red-600 pl-8">
                                        Top 10 Today
                                    </h2>
                                } 
                                movies={topTenMovies} 
                                onSelectMovie={() => openAuthModal('signup')} 
                                watchedMovies={new Set()} 
                                watchlist={new Set()} 
                                likedMovies={new Set()} 
                                onToggleLike={() => {}} 
                                onToggleWatchlist={() => {}} 
                                onSupportMovie={() => {}} 
                                showRankings={true}
                            />
                        </div>
                    </section>
                )}

                {/* SECTION 3: REASONS (CHROMATIC BORDERS) */}
                <section className="py-40 px-6 max-w-[1600px] mx-auto">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-white italic">More reasons to join</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <ReasonCard 
                            title="Enjoy on your TV" 
                            desc="Install the native Roku app, or use our high-bitrate casting to stream on Apple TV and Chromecast."
                            icon="📺"
                        />
                        <ReasonCard 
                            title="Direct Support" 
                            desc="Bypass the gatekeepers. 70% of every ticket goes directly to the filmmakers."
                            icon="💎"
                        />
                        <ReasonCard 
                            title="Watch Everywhere" 
                            desc="Optimized for mobile, tablet, and desktop. Zero installation required for instant playback."
                            icon="🛰️"
                        />
                        <ReasonCard 
                            title="The Unpack"
                            desc="Access deep-dive interviews and curatorial dispatches from the cinematic underground."
                            icon="🍿"
                        />
                    </div>
                </section>

                {/* SECTION 4: FAQ */}
                <section className="py-40 px-6 bg-black border-y border-white/5">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-center mb-20">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                            <FaqItem 
                                question="What is Crate TV?" 
                                answer={<p>Crate TV is a streaming home for independent cinema. We provide a "Distribution Afterlife" for films, ensuring great stories live on long after the festival circuit.</p>}
                            />
                            <FaqItem 
                                question="How much does it cost?" 
                                answer={<p>Browsing the catalog and reading The Unpack is completely free. Most films are free to stream, while certain "Live Premieres" or premium rentals require a small one-time fee. You only pay for what you watch—no monthly subscriptions.</p>}
                            />
                            <FaqItem 
                                question="Where can I watch?" 
                                answer={<p>Watch on any web browser at cratetv.net. We also have a custom app available on the Roku Channel Store for the big-screen experience, and support casting to Apple TV and Chromecast devices.</p>}
                            />
                            <FaqItem 
                                question="How do I submit my film?" 
                                answer={
                                    <div className="space-y-6">
                                        <p>We are always looking for bold new voices. You can submit your work directly through our creator portal.</p>
                                        <button 
                                            onClick={() => { window.history.pushState({}, '', '/submit'); window.dispatchEvent(new Event('pushstate')); }}
                                            className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest hover:bg-gray-200 transition-all shadow-xl active:scale-95"
                                        >
                                            Submit Your Work
                                        </button>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* SECTION 5: FINAL CALL */}
                <section className="relative py-48 px-6 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)]"></div>
                    <div className="relative z-10 max-w-4xl mx-auto space-y-12">
                        <h2 className="text-fluid-hero font-black uppercase tracking-tighter italic leading-none">The work is waiting.</h2>
                        <p className="text-gray-400 text-xl font-medium">Ready to watch? Enter your email to create your free account.</p>
                        <form onSubmit={(e) => { e.preventDefault(); openAuthModal('signup'); }} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                className="flex-grow p-6 bg-white/5 border border-white/10 rounded-2xl text-white text-xl focus:border-red-600 outline-none transition-all"
                                required
                            />
                            <button 
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-12 rounded-2xl text-xl uppercase tracking-tighter transition-all"
                            >
                                Get Started
                            </button>
                        </form>
                    </div>
                </section>
            </main>

            <Footer />
            {isAuthModalOpen && (
                <AuthModal 
                    initialView={initialAuthView} 
                    onClose={() => setIsAuthModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default LandingPage;