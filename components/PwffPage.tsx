import React, { useState, useEffect, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import Header from './Header';
import LiveWatchPartyBanner from './LiveWatchPartyBanner';
import BottomNavBar from './BottomNavBar';
import WatchPartyLobby from './WatchPartyLobby';
import FestivalTicketFlow from './FestivalTicketFlow';

const trackPageView = async () => {
    const db = getDbInstance();
    if (!db) return;
    db.collection('pwff_analytics').doc('views').set({
        total: firebase.firestore.FieldValue.increment(1),
        lastView: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
};

// ─── EMAIL CAPTURE ────────────────────────────────────────────────────────────
const EmailCapture: React.FC<{ source: 'teaser' | 'programme'; label?: string }> = ({ source, label }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const db = getDbInstance();
            if (!db) throw new Error();
            await db.collection('pwff_interest').add({
                email: email.trim().toLowerCase(),
                name: name.trim() || null,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                source,
            });
            setSubmitted(true);
        } catch { } finally { setLoading(false); }
    };

    if (submitted) return (
        <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-500/30 text-green-400 px-5 py-3 rounded-full text-sm font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            You're on the list!
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" required className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" />
            <button type="submit" disabled={loading} className="flex-shrink-0 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all">
                {loading ? '...' : (label || 'Notify Me')}
            </button>
        </form>
    );
};

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────
const Countdown: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    useEffect(() => {
        const tick = () => {
            const diff = new Date(targetDate).getTime() - Date.now();
            if (diff <= 0) return;
            setTime({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [targetDate]);

    const unit = (val: number, label: string) => (
        <div className="text-center">
            <div className="text-3xl md:text-5xl font-black text-white tabular-nums leading-none">{String(val).padStart(2, '0')}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-600 mt-1">{label}</div>
        </div>
    );

    return (
        <div className="flex items-center gap-4 md:gap-8">
            {time.days > 0 && <>{unit(time.days, 'Days')}<span className="text-gray-700 text-2xl font-black">·</span></>}
            {unit(time.hours, 'Hours')}
            <span className="text-gray-700 text-2xl font-black">·</span>
            {unit(time.minutes, 'Min')}
            <span className="text-gray-700 text-2xl font-black">·</span>
            {unit(time.seconds, 'Sec')}
        </div>
    );
};

// ─── DIRECTOR CARD ────────────────────────────────────────────────────────────
const DirectorCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const [expanded, setExpanded] = useState(false);
    if (!movie.festivalDirectorNote && !movie.festivalFilmmakerBio) return null;
    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex gap-4 p-5">
                {movie.festivalFilmmakerPhoto && (
                    <img src={movie.festivalFilmmakerPhoto} alt={movie.director} className="w-16 h-16 rounded-full object-cover border border-white/10 flex-shrink-0" />
                )}
                <div className="flex-grow min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">Director</p>
                    <h3 className="font-black text-white text-base">{movie.director}</h3>
                    <p className="text-xs text-gray-500 font-bold">{movie.title}</p>
                    {movie.festivalAwards && (
                        <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            {movie.festivalAwards}
                        </span>
                    )}
                </div>
            </div>

            {movie.festivalQuote && (
                <div className="px-5 pb-3">
                    <p className="text-sm text-gray-300 italic border-l-2 border-red-600 pl-3">
                        "{movie.festivalQuote}"
                    </p>
                </div>
            )}

            {(movie.festivalDirectorNote || movie.festivalFilmmakerBio) && (
                <div className="px-5 pb-5">
                    {movie.festivalDirectorNote && (
                        <div className="mb-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">Director's Note</p>
                            <p className={`text-sm text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
                                {movie.festivalDirectorNote}
                            </p>
                        </div>
                    )}
                    {movie.festivalFilmmakerBio && expanded && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">About the Filmmaker</p>
                            <p className="text-sm text-gray-400 leading-relaxed">{movie.festivalFilmmakerBio}</p>
                        </div>
                    )}
                    <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest mt-2 transition-colors">
                        {expanded ? 'Show less ↑' : 'Read more ↓'}
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── FILM ROW ─────────────────────────────────────────────────────────────────
const FilmRow: React.FC<{ movie: Movie; index: number; isUnlocked: boolean; onWatch: () => void }> = ({ movie, index, isUnlocked, onWatch }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="flex gap-4 py-5 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-black text-gray-700 w-5 flex-shrink-0 pt-1">{String(index + 1).padStart(2, '0')}</span>
            <div className="flex-shrink-0 w-12">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-900 border border-white/5">
                    {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />}
                </div>
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{movie.title}</h4>
                    {isUnlocked && <button onClick={onWatch} className="text-[9px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-full flex-shrink-0">Watch</button>}
                </div>
                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">Directed by {movie.director}</p>
                <div className="flex flex-wrap gap-2 mb-1">
                    {movie.durationInMinutes && <span className="text-[10px] text-gray-600">{movie.durationInMinutes} min</span>}
                    {movie.genres?.map(g => <span key={g} className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{g}</span>)}
                    {movie.festivalAwards && <span className="text-[10px] text-amber-400 font-bold">{movie.festivalAwards}</span>}
                </div>
                {movie.synopsis && (
                    <>
                        <p className={`text-xs text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{movie.synopsis}</p>
                        {movie.synopsis.length > 100 && <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-gray-600 hover:text-white uppercase tracking-widest mt-1 transition-colors">{expanded ? 'Less ↑' : 'More ↓'}</button>}
                    </>
                )}
            </div>
        </div>
    );
};

// ─── BLOCK CARD ───────────────────────────────────────────────────────────────
const BlockCard: React.FC<{
    block: FilmBlock; films: Movie[]; isUnlocked: boolean; isLive: boolean;
    isBeforeScreening?: boolean; screeningStartTime?: string;
    dayLabel: string; onBuyTicket: () => void; onEnterLobby: () => void; onWatch: (key: string) => void;
}> = ({ block, films, isUnlocked, isLive, isBeforeScreening, screeningStartTime, dayLabel, onBuyTicket, onEnterLobby, onWatch }) => {
    const totalMins = films.reduce((a, m) => a + (m.durationInMinutes || 0), 0);
    const screenStart = screeningStartTime ? new Date(screeningStartTime) : null;
    const screenEnd = screenStart ? new Date(screenStart.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
    return (
        <div className={`rounded-2xl border overflow-hidden ${isLive ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.12)]' : 'border-white/8'}`}>
            <div className="bg-white/[0.02] border-b border-white/5 p-5 md:p-7">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        {isLive && (
                            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-3 py-1 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Live Now</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{dayLabel}</span>
                            {block.time && <><span className="w-1 h-1 rounded-full bg-gray-700" /><span className="text-[9px] text-gray-600 uppercase tracking-widest">{block.time}</span></>}
                            {totalMins > 0 && <><span className="w-1 h-1 rounded-full bg-gray-700" /><span className="text-[9px] text-gray-600">{Math.floor(totalMins / 60)}h {totalMins % 60}m total</span></>}
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{block.title}</h2>
                        <p className="text-xs text-gray-600 mt-1">{films.length} film{films.length !== 1 ? 's' : ''}</p>
                        {screenStart && (
                            <p className="text-[10px] text-gray-500 mt-1.5">
                                {isBeforeScreening
                                    ? <>Streams live {screenStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {screenStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · Available to rewatch until {screenEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                    : <>Available to watch until {screenEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                }
                            </p>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                        {isLive
                            ? <button onClick={onEnterLobby} className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all">Join Live</button>
                            : isBeforeScreening && isUnlocked
                                ? <div className="inline-flex items-center gap-1.5 bg-amber-900/20 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Ticket Confirmed</div>
                            : isUnlocked
                                ? <div className="inline-flex items-center gap-1.5 bg-green-900/20 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />Confirmed</div>
                                : block.price && block.price > 0
                                    ? <button onClick={onBuyTicket} className="bg-white hover:bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all">Get Ticket · ${block.price.toFixed(2)}</button>
                                    : <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Free</span>}
                    </div>
                </div>
            </div>
            <div className="px-5 md:px-7">
                {films.length > 0
                    ? films.map((f, i) => <FilmRow key={f.key} movie={f} index={i} isUnlocked={isUnlocked} onWatch={() => onWatch(f.key)} />)
                    : <p className="py-8 text-center text-gray-700 text-xs uppercase tracking-widest font-black">Programme coming soon</p>}
            </div>
        </div>
    );
};

// ─── TEASER MODE ──────────────────────────────────────────────────────────────
const TeaserMode: React.FC<{
    date?: string;
    name?: string;
    description?: string;
    tagline?: string;
}> = ({ date, name, description, tagline }) => (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-8 pt-32 pb-16">

            <div>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-3">{name || 'Playhouse West Film Festival'}</h1>
                <div className="w-16 h-1 bg-red-600 mx-auto rounded-full" />
            </div>
            {(tagline || true) && <p className="text-gray-500 text-sm uppercase tracking-widest font-bold">{tagline || <span>Presented by <span style={{color:'white'}}>Crate TV</span></span>}</p>}
            {date && (
                <div className="bg-white/5 border border-white/8 rounded-2xl px-8 py-5 inline-block">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-1">Festival Date</p>
                    <p className="text-2xl font-black text-white">{date}</p>
                </div>
            )}
            {description && (
                <p className="text-gray-400 text-base leading-relaxed max-w-lg mx-auto">{description}</p>
            )}
            <div className="space-y-3">
                <p className="text-sm text-gray-500">Be the first to know when tickets go on sale.</p>
                <EmailCapture source="teaser" />
            </div>
            <div className="pt-4 border-t border-white/5">
                <button onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }} className="text-xs text-gray-600 hover:text-white transition-colors uppercase tracking-widest font-bold">Explore Crate TV →</button>
            </div>
        </div>
    </div>
);

// ─── PROGRAMME MODE ───────────────────────────────────────────────────────────
const ProgrammeMode: React.FC = () => {
    const { festivalData, festivalConfig, movies, activeParties, settings } = useFestival();
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockFestivalBlock, grantFestivalAllAccess, unlockedWatchPartyKeys, user } = useAuth();

    const [activeDay, setActiveDay] = useState(1);
    const [ticketFlowBlock, setTicketFlowBlock] = useState<FilmBlock | null>(null);
    const [showLobbyFor, setShowLobbyFor] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'programme' | 'directors' | 'faq'>('programme');

    const currentDay = useMemo(() => festivalData.find(d => d.day === activeDay) || festivalData[0], [festivalData, activeDay]);
    const allBlocks = useMemo(() => festivalData.flatMap(d => d.blocks), [festivalData]);
    const allFestivalFilms = useMemo(() => allBlocks.flatMap(b => b.movieKeys.map(k => movies[k]).filter(Boolean)) as Movie[], [allBlocks, movies]);
    const filmsWithNotes = useMemo(() => allFestivalFilms.filter(m => m.festivalDirectorNote || m.festivalFilmmakerBio || m.festivalQuote), [allFestivalFilms]);
    const totalFilms = allFestivalFilms.length;

    const navigate = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new Event('pushstate')); };

    const handlePaymentSuccess = async (details: any) => {
        if (details.itemId) await unlockFestivalBlock(details.itemId);
        setTicketFlowBlock(null);
    };

    const lobbyMovie = useMemo(() => {
        if (!showLobbyFor) return null;
        const block = allBlocks.find(b => b.id === showLobbyFor);
        if (!block) return null;
        const first = movies[block.movieKeys?.[0]];
        return { key: block.id, title: block.title, isWatchPartyEnabled: true, isWatchPartyPaid: (block.price || 0) > 0, watchPartyPrice: block.price, poster: first?.poster || '', director: 'Festival Event', synopsis: '', cast: [], trailer: '', fullMovie: first?.fullMovie || '', tvPoster: '', likes: 0 } as Movie;
    }, [showLobbyFor, allBlocks, movies]);

    // opening night date from first block with watchPartyStartTime
    const openingNightDate = useMemo(() => {
        const first = allBlocks.find(b => b.watchPartyStartTime);
        return first?.watchPartyStartTime;
    }, [allBlocks]);

    const FAQ = [
        { q: "Do I need to download anything?", a: "No. Everything streams right in your browser — phone, tablet, laptop, or smart TV. You can also watch on your Roku TV if you have the Crate TV channel installed." },
        { q: "When can I watch the films?", a: "Each block goes live at the same time it screens physically in Philadelphia. Once it's live, you can watch and rewatch for two weeks after the festival ends." },
        { q: "What's the difference between a block ticket and an all-access pass?", a: "A block ticket gives you access to one specific screening block. An all-access pass gets you into every block across the entire festival — it's the best value if you want to watch everything." },
        { q: "I already have a Crate account. Do I still need a ticket?", a: "Yes — festival blocks are ticketed separately. Your existing Crate account handles payment, so checkout is quick." },
        { q: "What happens after the festival ends?", a: "Your ticket gives you on-demand access to all the films in your block for two weeks after the festival. After that, selected films may remain in the Crate library." },
        { q: "Is Crate TV free?", a: "Yes — creating a Crate account is completely free. Festival block tickets are sold separately for the PWFF programme." },
    ];

    return (
        <div className="max-w-3xl mx-auto px-4 pb-32 pt-8">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <div className="text-center py-12 md:py-20 mb-2">
                <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Official Programme</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-3">
                    {festivalConfig?.title || 'Playhouse West Film Festival'}
                </h1>
                {festivalConfig?.subheader
                    ? <p className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mb-4">{festivalConfig.subheader}</p>
                    : <p className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mb-4">{getPwffAnnualNumber(settings, festivalConfig)} Annual Official Selections</p>
                }
                {festivalConfig?.description && <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed mb-5">{festivalConfig.description}</p>}
                {festivalConfig?.startDate && <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-6">{festivalConfig.startDate}{festivalConfig.endDate && festivalConfig.endDate !== festivalConfig.startDate ? ` — ${festivalConfig.endDate}` : ''}</p>}

                {/* Countdown */}
                {openingNightDate && new Date(openingNightDate) > new Date() && (
                    <div className="mb-8">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">Opening Night In</p>
                        <div className="flex justify-center">
                            <Countdown targetDate={openingNightDate} />
                        </div>
                    </div>
                )}

                {/* Stats */}
                {totalFilms > 0 && (
                    <div className="flex justify-center gap-6 mb-8">
                        <div className="text-center"><p className="text-2xl font-black text-white">{totalFilms}</p><p className="text-[9px] text-gray-600 uppercase tracking-widest">Films</p></div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center"><p className="text-2xl font-black text-white">{festivalData.length}</p><p className="text-[9px] text-gray-600 uppercase tracking-widest">Day{festivalData.length !== 1 ? 's' : ''}</p></div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center"><p className="text-2xl font-black text-white">{allBlocks.length}</p><p className="text-[9px] text-gray-600 uppercase tracking-widest">Block{allBlocks.length !== 1 ? 's' : ''}</p></div>
                    </div>
                )}

                {/* Pass CTA */}
                {!hasFestivalAllAccess
                    ? <div className="space-y-2">
                        <button
                            onClick={() => {
                                // Create a synthetic "full festival" block for the ticket flow
                                const fullPassBlock = { id: 'full-festival-pass', title: settings?.pwffFestivalName || 'PWFF Full Festival Pass', time: '', movieKeys: allBlocks.flatMap(b => b.movieKeys), price: 50 };
                                setTicketFlowBlock(fullPassBlock as any);
                            }}
                            className="bg-white text-black font-black uppercase tracking-widest text-sm px-8 py-3.5 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                        >
                            All-Access Pass · ${settings?.pwffFullPassPrice || 50}
                        </button>
                        <p className="text-[10px] text-gray-600">Or buy individual block tickets below</p>
                      </div>
                    : <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />All-Access Pass Active</div>}
            </div>

            {/* ── EMAIL STRIP ───────────────────────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 text-center">
                <p className="text-sm font-bold text-white mb-1">Stay in the loop</p>
                <p className="text-xs text-gray-500 mb-4">Get schedule updates and filmmaker news delivered to your inbox.</p>
                <div className="flex justify-center"><EmailCapture source="programme" /></div>
            </div>

            {/* ── NAV TABS ──────────────────────────────────────────────────── */}
            <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/5 rounded-xl p-1">
                {([['programme', 'Programme'], ['directors', 'Filmmakers'], ['faq', 'FAQ']] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setActiveSection(key)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSection === key ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── PROGRAMME TAB ─────────────────────────────────────────────── */}
            {activeSection === 'programme' && (
                <>
                    {festivalData.length > 1 && (
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                            {festivalData.map(day => (
                                <button key={day.day} onClick={() => setActiveDay(day.day)}
                                    className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeDay === day.day ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}>
                                    Day {day.day}{day.date ? ` · ${day.date}` : ''}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="space-y-5">
                        {currentDay?.blocks.length > 0 ? currentDay.blocks.map(block => {
                            const films = block.movieKeys.map(k => movies[k]).filter(Boolean) as Movie[];
                            const isUnlocked = hasFestivalAllAccess || unlockedFestivalBlockIds.has(block.id);
                            const isLive = activeParties[block.id]?.status === 'live';
                            // Screening window: available from screeningStartTime to screeningStartTime + 14 days
                            const now = Date.now();
                            const screenStart = block.screeningStartTime ? new Date(block.screeningStartTime).getTime() : null;
                            const screenEnd = screenStart ? screenStart + 14 * 24 * 60 * 60 * 1000 : null;
                            const isInScreeningWindow = screenStart ? (now >= screenStart && (!screenEnd || now <= screenEnd)) : true;
                            const isBeforeScreening = screenStart ? now < screenStart : false;
                            return (
                                <BlockCard key={block.id} block={block} films={films} isUnlocked={isUnlocked && isInScreeningWindow} isLive={isLive} isBeforeScreening={isBeforeScreening} screeningStartTime={block.screeningStartTime}
                                    dayLabel={`Day ${currentDay.day}`}
                                    onBuyTicket={() => setTicketFlowBlock(block)}
                                    onEnterLobby={() => setShowLobbyFor(block.id)}
                                    onWatch={key => navigate(`/movie/${key}?play=true`)}
                                />
                            );
                        }) : (
                            <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                                <p className="text-gray-700 text-xs uppercase tracking-widest font-black">Programme coming soon</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── FILMMAKERS TAB ────────────────────────────────────────────── */}
            {activeSection === 'directors' && (
                <div className="space-y-4">
                    {filmsWithNotes.length > 0
                        ? filmsWithNotes.map(m => <DirectorCard key={m.key} movie={m} />)
                        : <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl"><p className="text-gray-700 text-xs uppercase tracking-widest font-black">Filmmaker notes coming soon</p></div>}
                </div>
            )}

            {/* ── FAQ TAB ───────────────────────────────────────────────────── */}
            {activeSection === 'faq' && (
                <div className="space-y-3">
                    {FAQ.map((item, i) => (
                        <details key={i} className="group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                            <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                                <span className="text-sm font-bold text-white">{item.q}</span>
                                <svg className="w-4 h-4 text-gray-600 transition-transform group-open:rotate-180 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </summary>
                            <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">{item.a}</div>
                        </details>
                    ))}
                </div>
            )}

            {/* ── TICKET FLOW ───────────────────────────────────────────────── */}
            {ticketFlowBlock && (() => {
                const first = movies[ticketFlowBlock.movieKeys?.[0]];
                const bMovie: Movie = { key: ticketFlowBlock.id, title: ticketFlowBlock.title, isWatchPartyEnabled: true, isWatchPartyPaid: (ticketFlowBlock.price || 0) > 0, watchPartyPrice: ticketFlowBlock.price, poster: first?.poster || '', director: first?.director || 'Festival Event', synopsis: '', cast: [], trailer: '', fullMovie: first?.fullMovie || '', tvPoster: '', likes: 0 };
                return <FestivalTicketFlow
                    block={ticketFlowBlock}
                    blockMovie={bMovie}
                    onClose={() => setTicketFlowBlock(null)}
                    onSuccess={() => {
                        const blockId = ticketFlowBlock.id;
                        setTicketFlowBlock(null);
                        setShowLobbyFor(blockId);
                    }}
                />;
            })()}

            {/* ── LOBBY OVERLAY ─────────────────────────────────────────────── */}
            {showLobbyFor && lobbyMovie && (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <WatchPartyLobby movie={lobbyMovie} partyState={activeParties[showLobbyFor]}
                        onPartyStart={() => { setShowLobbyFor(null); navigate(`/watchparty/${showLobbyFor}`); }}
                        user={user}
                        hasAccess={hasFestivalAllAccess || unlockedFestivalBlockIds.has(showLobbyFor) || unlockedWatchPartyKeys.has(showLobbyFor)}
                        onBuyTicket={() => { const b = allBlocks.find(x => x.id === showLobbyFor); if (b) setTicketFlowBlock(b); }}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}
        </div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// Auto-calculates the annual edition number from the festival year
// PWFF was founded in 2013 — 2026 = 13th Annual, 2027 = 14th Annual, etc.
function getPwffAnnualNumber(settings?: any, festivalConfig?: any): string {
    // Admin can override manually
    if (settings?.pwffAnnualNumber) return ordinal(settings.pwffAnnualNumber);
    
    // Auto-calculate from year
    const foundingYear = settings?.pwffFoundingYear || 2013;
    const currentYear = new Date().getFullYear();
    // Try to get year from festival config dates, fall back to current year
    let festYear = currentYear;
    if (festivalConfig?.startDate) {
        const d = new Date(festivalConfig.startDate);
        if (!isNaN(d.getTime())) festYear = d.getFullYear();
    }
    const edition = festYear - foundingYear + 1;
    return ordinal(edition);
}

function ordinal(n: number): string {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
}

const PwffPage: React.FC = () => {
    const { settings, isLoading, livePartyMovie, activeParties, festivalData, movies } = useFestival();
    const { unlockedWatchPartyKeys, unlockedFestivalBlockIds, hasFestivalAllAccess, user } = useAuth();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [showLobbyFor, setShowLobbyFor] = useState<string | null>(null);
    const [ticketFlowBlock, setTicketFlowBlock] = useState<FilmBlock | null>(null);

    useEffect(() => { trackPageView(); }, []);

    const showBanner = !!livePartyMovie && !bannerDismissed;

    // Find the block associated with the live party movie
    const liveBlock = useMemo(() => {
        if (!livePartyMovie) return null;
        return festivalData.flatMap(d => d.blocks).find(b => b.id === livePartyMovie.key || b.movieKeys.includes(livePartyMovie.key)) || null;
    }, [livePartyMovie, festivalData]);

    const hasAccessToLive = useMemo(() => {
        if (!livePartyMovie) return false;
        if (hasFestivalAllAccess) return true;
        if (unlockedWatchPartyKeys.has(livePartyMovie.key)) return true;
        if (liveBlock && unlockedFestivalBlockIds.has(liveBlock.id)) return true;
        return false;
    }, [livePartyMovie, hasFestivalAllAccess, unlockedWatchPartyKeys, unlockedFestivalBlockIds, liveBlock]);

    // Banner click: if they have access → open lobby; if not → open ticket flow
    const handleBannerClick = () => {
        if (!livePartyMovie) return;
        if (hasAccessToLive) {
            setShowLobbyFor(livePartyMovie.key);
        } else if (liveBlock) {
            setTicketFlowBlock(liveBlock);
        } else {
            setShowLobbyFor(livePartyMovie.key);
        }
    };

    const lobbyMovie = useMemo(() => {
        if (!showLobbyFor || !livePartyMovie) return null;
        return livePartyMovie;
    }, [showLobbyFor, livePartyMovie]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!settings?.pwffProgramVisible) return (
        <>
            {showBanner && (
                <LiveWatchPartyBanner
                    movie={livePartyMovie!}
                    onEnterLobby={handleBannerClick}
                    onClose={() => setBannerDismissed(true)}
                />
            )}
            <Header searchQuery="" onSearch={() => {}} isScrolled={false} onMobileSearchClick={() => {}} showSearch={false} topOffset={showBanner ? '3rem' : '0px'} />
            <TeaserMode
                date={settings?.pwffFestivalDate}
                name={settings?.pwffFestivalName}
                description={settings?.pwffTeaserDescription}
                tagline={settings?.pwffTeaserTagline}
            />
            {ticketFlowBlock && (() => {
                const first = movies[ticketFlowBlock.movieKeys?.[0]];
                const bMovie: Movie = { key: ticketFlowBlock.id, title: ticketFlowBlock.title, isWatchPartyEnabled: true, isWatchPartyPaid: (ticketFlowBlock.price || 0) > 0, watchPartyPrice: ticketFlowBlock.price, poster: first?.poster || '', director: first?.director || 'Festival Event', synopsis: '', cast: [], trailer: '', fullMovie: first?.fullMovie || '', tvPoster: '', likes: 0 };
                return <FestivalTicketFlow block={ticketFlowBlock} blockMovie={bMovie}
                    onClose={() => setTicketFlowBlock(null)}
                    onSuccess={() => { setTicketFlowBlock(null); setShowLobbyFor(ticketFlowBlock.id); }}
                />;
            })()}
            {lobbyMovie && showLobbyFor && (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <WatchPartyLobby
                        movie={lobbyMovie}
                        partyState={activeParties[showLobbyFor]}
                        onPartyStart={() => { setShowLobbyFor(null); window.history.pushState({}, '', `/watchparty/${showLobbyFor}`); window.dispatchEvent(new Event('pushstate')); }}
                        user={user}
                        hasAccess={hasFestivalAllAccess || unlockedFestivalBlockIds.has(showLobbyFor) || unlockedWatchPartyKeys.has(showLobbyFor)}
                        onBuyTicket={() => { if (liveBlock) setTicketFlowBlock(liveBlock); }}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}
            <BottomNavBar onSearchClick={() => {}} />
        </>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {showBanner && (
                <LiveWatchPartyBanner
                    movie={livePartyMovie!}
                    onEnterLobby={handleBannerClick}
                    onClose={() => setBannerDismissed(true)}
                />
            )}
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} topOffset={showBanner ? '3rem' : '0px'} />
            <ProgrammeMode />
            {ticketFlowBlock && (() => {
                const first = movies[ticketFlowBlock.movieKeys?.[0]];
                const bMovie: Movie = { key: ticketFlowBlock.id, title: ticketFlowBlock.title, isWatchPartyEnabled: true, isWatchPartyPaid: (ticketFlowBlock.price || 0) > 0, watchPartyPrice: ticketFlowBlock.price, poster: first?.poster || '', director: first?.director || 'Festival Event', synopsis: '', cast: [], trailer: '', fullMovie: first?.fullMovie || '', tvPoster: '', likes: 0 };
                return <FestivalTicketFlow block={ticketFlowBlock} blockMovie={bMovie}
                    onClose={() => setTicketFlowBlock(null)}
                    onSuccess={() => { setTicketFlowBlock(null); setShowLobbyFor(ticketFlowBlock.id); }}
                />;
            })()}
            {lobbyMovie && showLobbyFor && (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <WatchPartyLobby
                        movie={lobbyMovie}
                        partyState={activeParties[showLobbyFor]}
                        onPartyStart={() => { setShowLobbyFor(null); window.history.pushState({}, '', `/watchparty/${showLobbyFor}`); window.dispatchEvent(new Event('pushstate')); }}
                        user={user}
                        hasAccess={hasFestivalAllAccess || unlockedFestivalBlockIds.has(showLobbyFor) || unlockedWatchPartyKeys.has(showLobbyFor)}
                        onBuyTicket={() => { if (liveBlock) setTicketFlowBlock(liveBlock); }}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default PwffPage;
