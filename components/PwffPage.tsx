import React, { useState, useEffect, useMemo } from 'react';
import { Movie, FilmBlock } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LiveWatchPartyBanner from './LiveWatchPartyBanner';
import Header from './Header';
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
                    {(movie.durationInMinutes ?? 0) > 0 && <span className="text-[10px] text-gray-600">{movie.durationInMinutes} min</span>}
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

// Registers interest in a sold-out block. Kept deliberately simple — no
// auto-notify-when-a-spot-opens (there's no natural mechanism for a spot to
// free up on a digital cap), just a way for the admin to see who wanted in.
const WaitlistButton: React.FC<{ blockId: string }> = ({ blockId }) => {
    const { user, getUserIdToken } = useAuth();
    const [joined, setJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = async () => {
        if (!user) {
            window.history.pushState({}, '', `/login?redirect=${encodeURIComponent(window.location.pathname)}`);
            window.dispatchEvent(new Event('pushstate'));
            return;
        }
        setIsJoining(true);
        try {
            const idToken = await getUserIdToken();
            if (!idToken) return;
            const res = await fetch('/api/join-waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockId, idToken }),
            });
            if (res.ok) setJoined(true);
        } catch (e) {
            console.error('Failed to join waitlist:', e);
        } finally {
            setIsJoining(false);
        }
    };

    if (joined) {
        return <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-5 py-2.5">You're On The List</span>;
    }
    return (
        <button
            onClick={handleJoin}
            disabled={isJoining}
            className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
        >
            {isJoining ? 'Joining…' : 'Join Waitlist'}
        </button>
    );
};

// ─── BLOCK CARD ───────────────────────────────────────────────────────────────
const BlockCard: React.FC<{
    block: FilmBlock; films: Movie[]; isUnlocked: boolean; isLive: boolean; isEnded?: boolean;
    isBeforeScreening?: boolean; screeningStartTime?: string; filmsWatchable?: boolean;
    dayLabel: string; onBuyTicket: () => void; onEnterLobby: () => void; onWatch: (key: string) => void;
}> = ({ block, films, isUnlocked, isLive, isEnded, isBeforeScreening, screeningStartTime, filmsWatchable, dayLabel, onBuyTicket, onEnterLobby, onWatch }) => {
    const totalMins = films.reduce((a, m) => a + (m.durationInMinutes || 0), 0);
    const screenStart = screeningStartTime ? new Date(screeningStartTime) : null;
    const screenEnd = screenStart ? new Date(screenStart.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    // Optional — most blocks have no capacity set, meaning unlimited
    // (unchanged default behavior). Only relevant when an admin explicitly
    // set a cap in the Festival Hub.
    const isSoldOut = !isUnlocked && !!block.capacity && (block.ticketsSold || 0) >= block.capacity;
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
                        {isEnded && (
                            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-3 py-1 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Screening Ended · Now in Catalog</span>
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
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        {isSoldOut && isBeforeScreening ? (
                            <>
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Sold Out</span>
                                <WaitlistButton blockId={block.id} />
                            </>
                        ) : isLive
                            ? <button onClick={onEnterLobby} className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all animate-pulse active:scale-95">Join Party</button>
                            : isBeforeScreening && (isUnlocked || !block.price || block.price === 0)
                                ? <button onClick={onEnterLobby} className="bg-white hover:bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95">Enter Lobby</button>
                            : isBeforeScreening && !isUnlocked && block.price && block.price > 0
                                ? <button onClick={onBuyTicket} className="bg-white hover:bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95">Get Ticket — ${block.price.toFixed(2)}</button>
                            // Screening's over and this is unlocked — the block's live watch
                            // party has ended (WatchPartyPage explicitly dead-ends on "ended"
                            // parties, it doesn't replay them), so "Watch Now" needs to go
                            // straight to the actual on-demand catalog player for the first
                            // film, not back into the (now pointless) lobby.
                            : isUnlocked
                                ? <button onClick={() => films[0] && onWatch(films[0].key)} disabled={films.length === 0} className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">Watch Now</button>
                                : block.price && block.price > 0
                                    ? <button onClick={onBuyTicket} className="bg-white hover:bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all">Get Ticket — ${block.price.toFixed(2)}</button>
                                    : <button onClick={() => films[0] && onWatch(films[0].key)} disabled={films.length === 0} className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">Watch Free</button>}
                    </div>
                </div>
            </div>
            <div className="px-5 md:px-7">
                {films.length > 0
                    // Per-film rows used to be gated on the same `isUnlocked` as
                    // the block header button above — but that one means "does
                    // this viewer hold a ticket," which is true from the moment
                    // they buy it, days before the block airs. The header button
                    // never showed that as watchable pre-screening because its
                    // own if/else chain checks isBeforeScreening FIRST and shows
                    // "Enter Lobby" instead — but these per-film rows had no
                    // equivalent check, so ticket holders saw a live "Watch"
                    // button on every film in a block that hadn't happened yet,
                    // and clicking it did open the on-demand player early (see
                    // MoviePage's hasAccess — it grants access on ticket
                    // ownership alone, with no timing check of its own either).
                    // filmsWatchable adds the missing timing gate: only once the
                    // block is actually in its live window or already ended.
                    ? films.map((f, i) => <FilmRow key={f.key} movie={f} index={i} isUnlocked={!!filmsWatchable} onWatch={() => onWatch(f.key)} />)
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
                <h1 className="text-fluid-title font-black uppercase tracking-tighter leading-none mb-3 break-words">{name || 'Playhouse West Film Festival - Philadelphia'}</h1>
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
    const { festivalData, festivalConfig, movies, activeParties, allPartyStates, settings } = useFestival();
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockFestivalBlock, unlockedWatchPartyKeys, user, getUserIdToken } = useAuth();

    const [activeDay, setActiveDay] = useState(1);
    const [ticketFlowBlock, setTicketFlowBlock] = useState<FilmBlock | null>(null);
    const [showLobbyFor, setShowLobbyFor] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'programme' | 'directors'>('programme');

    const currentDay = useMemo(() => festivalData.find(d => d.day === activeDay) || festivalData[0], [festivalData, activeDay]);
    const allBlocks = useMemo(() => festivalData.flatMap(d => d.blocks || []), [festivalData]);
    // Blocks are stored in whatever order they were added in the Festival
    // Manager admin (see FestivalEditor's addBlock, which just pushes onto
    // the array) — that's insertion order, not screening order, so a block
    // added later for an earlier time slot rendered below one for a later
    // slot. Sorting by actual scheduled time here fixes display without
    // touching how blocks are stored/added. Blocks with no time set sort to
    // the end (rather than the top) so an unscheduled block doesn't jump
    // ahead of everything that IS scheduled.
    const sortedDayBlocks = useMemo(() => {
        const blocks = currentDay?.blocks || [];
        const getTime = (b: FilmBlock) => {
            const t = b.screeningStartTime || b.watchPartyStartTime;
            const parsed = t ? new Date(t).getTime() : NaN;
            return isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
        };
        return [...blocks].sort((a, b) => getTime(a) - getTime(b));
    }, [currentDay]);
    const allFestivalFilms = useMemo(() => allBlocks.flatMap(b => (b.movieKeys || []).map(k => movies[k]).filter(Boolean)) as Movie[], [allBlocks, movies]);
    const filmsWithNotes = useMemo(() => allFestivalFilms.filter(m => m.festivalDirectorNote || m.festivalFilmmakerBio || m.festivalQuote), [allFestivalFilms]);

    const navigate = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new Event('pushstate')); };

    const lobbyMovie = useMemo(() => {
        if (!showLobbyFor) return null;
        const block = allBlocks.find(b => b.id === showLobbyFor);
        if (!block) return null;
        const first = movies[block.movieKeys?.[0]];
        // screeningStartTime drives the lobby countdown
        // fullMovie from first film is the merged .m3u8 block stream
        const startTime = block.screeningStartTime || block.watchPartyStartTime || '';
        return { 
            key: block.id, 
            title: block.title, 
            isWatchPartyEnabled: true, 
            isWatchPartyPaid: (block.price || 0) > 0, 
            watchPartyPrice: block.price, 
            poster: first?.poster || '', 
            director: block.title || 'PWFF-Philly 2026', 
            synopsis: `${block.movieKeys?.length || 0} films screening ${block.time ? 'at ' + block.time : ''}`, 
            cast: [], 
            trailer: '', 
            fullMovie: first?.fullMovie || '',
            tvPoster: first?.poster || '', 
            likes: 0,
            watchPartyStartTime: startTime,
        } as Movie;
    }, [showLobbyFor, allBlocks, movies]);

    const openingNightDate = useMemo(() => {
        // Was previously `allBlocks.find(b => b.watchPartyStartTime)` — the first
        // scheduled block in ARRAY order, not necessarily the earliest one
        // chronologically, AND it only ever looked at `watchPartyStartTime`.
        // Blocks scheduled from the PWFF Festival editor are set via
        // `screeningStartTime` (see the `lobbyMovie` fallback above, which
        // already does `block.screeningStartTime || block.watchPartyStartTime`)
        // — that field only mirrors into `watchPartyStartTime` when the editor
        // explicitly re-saves the manifest. If the real opening block's date
        // was only ever set as `screeningStartTime`, this countdown skipped it
        // entirely and locked onto whatever OTHER block (e.g. a test block)
        // happened to have `watchPartyStartTime` populated instead — which is
        // why the fix in the previous commit (soonest-upcoming instead of
        // first-in-array) didn't change anything: there was only one candidate
        // being considered to begin with. Checking both fields, and picking
        // the soonest upcoming one, fixes both problems at once.
        const now = Date.now();
        const upcoming = allBlocks
            .map(b => b.screeningStartTime || b.watchPartyStartTime)
            .filter((t): t is string => !!t && new Date(t).getTime() > now)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        return upcoming[0];
    }, [allBlocks]);

    // ── LIVE / UP-NEXT STRIP ──────────────────────────────────────────────
    // The opening-night countdown above only makes sense before the festival
    // starts. Once it's underway, visitors landing on this page (including
    // right after finishing a screening, since the credits screen sends
    // people back here) had no persistent "what's happening right now"
    // signal — they had to scroll/scan the full block list to figure out
    // what's live or coming up next. This surfaces the single most relevant
    // thing (live takes priority, else the soonest upcoming block) right
    // under the header at all times during the festival.
    const [liveOrNextTick, setLiveOrNextTick] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setLiveOrNextTick(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);
    const liveOrNextBlock = useMemo(() => {
        const now = liveOrNextTick;
        const live = allBlocks.find(b => activeParties[b.id]?.status === 'live');
        if (live) return { block: live, isLive: true, start: null as Date | null };

        const upcoming = allBlocks
            .map(b => ({ block: b, start: new Date(b.screeningStartTime || b.watchPartyStartTime || 0) }))
            .filter(x => !isNaN(x.start.getTime()) && x.start.getTime() > now)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
        return upcoming[0] ? { block: upcoming[0].block, isLive: false, start: upcoming[0].start } : null;
    }, [allBlocks, activeParties, liveOrNextTick]);

    return (
        <div className="min-h-screen bg-[#050505] text-white">

            {/* ZONE 1: THE HOOK */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(229,9,20,0.12)_0%,transparent_65%)] pointer-events-none" />
                <div className="relative max-w-2xl mx-auto px-4 pt-32 pb-16 text-center">
                    {/* pt-32 (was pt-20) — this section had no top clearance built in because
                        the page never had a fixed header before; now that it does, the old
                        80px wasn't reliably enough room to avoid the header overlapping this
                        badge/title on some devices. */}
                    <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
                            {getPwffAnnualNumber(settings, festivalConfig)} Annual
                        </span>
                    </div>

                    <h1 className="text-fluid-title font-black uppercase tracking-tighter leading-[0.9] mb-4 text-white break-words">
                        {festivalConfig?.title || settings?.pwffFestivalName || 'Playhouse West Film Festival - Philadelphia'}
                    </h1>

                    {festivalConfig?.description && (
                        <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed mb-8">
                            {festivalConfig.description}
                        </p>
                    )}

                    {openingNightDate && new Date(openingNightDate) > new Date() && (
                        <div className="mb-10">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">Opening Night In</p>
                            <div className="flex justify-center">
                                <Countdown targetDate={openingNightDate} />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-3">
                        {!hasFestivalAllAccess ? (
                            <>
                                <button
                                    onClick={() => {
                                        const fullPassBlock = { id: 'full-festival-pass', title: settings?.pwffFestivalName || 'PWFF Full Festival Pass', time: '', movieKeys: allBlocks.flatMap(b => b.movieKeys), price: settings?.pwffFullPassPrice || 50 };
                                        setTicketFlowBlock(fullPassBlock as any);
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm px-10 py-4 rounded-2xl active:scale-95 transition-all shadow-[0_0_30px_rgba(229,9,20,0.3)]"
                                >
                                    All-Access Pass — ${settings?.pwffFullPassPrice || 50}
                                </button>
                                <p className="text-[11px] text-gray-600">or buy individual block tickets below</p>
                            </>
                        ) : (
                            <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                All-Access Pass Active
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* ZONES 2 & 3: PROGRAMME + FILMMAKERS */}
            <div className="max-w-2xl mx-auto px-4 pb-32">

                <div className="flex gap-1 my-8 bg-white/[0.03] border border-white/5 rounded-xl p-1">
                    {([['programme', 'Programme'], ['directors', 'Filmmakers']] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setActiveSection(key)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSection === key ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {liveOrNextBlock && (
                    <div className={`mb-6 rounded-2xl border p-5 flex items-center justify-between gap-4 flex-wrap ${liveOrNextBlock.isLive ? 'bg-red-600/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${liveOrNextBlock.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${liveOrNextBlock.isLive ? 'text-red-400' : 'text-gray-500'}`}>
                                    {liveOrNextBlock.isLive ? 'Live Now' : 'Up Next'}
                                </p>
                                <p className="text-sm font-black text-white uppercase tracking-tight">
                                    {liveOrNextBlock.block.title}
                                    {!liveOrNextBlock.isLive && liveOrNextBlock.start && (
                                        <span className="text-gray-500 font-medium normal-case tracking-normal ml-2">
                                            starts {liveOrNextBlock.start.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLobbyFor(liveOrNextBlock.block.id)}
                            className={`flex-shrink-0 font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all ${liveOrNextBlock.isLive ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-white hover:bg-gray-100 text-black'}`}
                        >
                            {liveOrNextBlock.isLive ? 'Join Party' : 'Enter Lobby'}
                        </button>
                    </div>
                )}

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
                        <div className="space-y-4">
                            {sortedDayBlocks.length > 0 ? sortedDayBlocks.map(block => {
                                const films = (block.movieKeys || []).map(k => movies[k]).filter(Boolean) as Movie[];
                                const isUnlocked = hasFestivalAllAccess || unlockedFestivalBlockIds.has(block.id);
                                // `activeParties` only ever contains docs with status==='live' (it's
                                // filtered server-side), so once a party ends its doc simply disappears
                                // from `activeParties` — leaving `partyState` undefined here, same as a
                                // party that never started. That falsely tripped `isWaiting` (which
                                // treats "no doc" as "hasn't started yet"), which in turn made
                                // `isBeforeScreening` true again after the party had already ended,
                                // which let a viewer click straight into the dead lobby. `allPartyStates`
                                // includes 'ended' docs too, so use that as the source of truth for status.
                                const partyState = allPartyStates[block.id];
                                const isLive = partyState?.status === 'live';
                                const isEnded = partyState?.status === 'ended';
                                const isWaiting = !partyState || partyState?.status === 'waiting';
                                const screenStart = block.screeningStartTime ? new Date(block.screeningStartTime) : null;
                                const isBeforeScreening = !isEnded && ((screenStart ? new Date() < screenStart : false) || isWaiting);
                                const isInWindow = screenStart ? new Date() >= screenStart : true;
                                return (
                                    <BlockCard key={block.id} block={block} films={films}
                                        isUnlocked={isUnlocked}
                                        isLive={isLive}
                                        isEnded={isEnded}
                                        isBeforeScreening={isBeforeScreening}
                                        // Only "ended" unlocks the per-film catalog rows — not merely
                                        // "isInWindow" (i.e. past the scheduled start). While a block is
                                        // actually live, ticket holders are meant to go through "Join
                                        // Party" into the synced watch-party lobby, same as the block
                                        // header button above (which only ever reaches its own "Watch
                                        // Now" state once ended, never merely once live — this now
                                        // matches that exactly instead of jumping the gun during the
                                        // live window).
                                        filmsWatchable={isUnlocked && isEnded}
                                        screeningStartTime={block.screeningStartTime}
                                        dayLabel={`Day ${activeDay}`}
                                        onBuyTicket={() => setTicketFlowBlock(block)}
                                        onEnterLobby={() => setShowLobbyFor(block.id)}
                                        // /watchparty/{key} is the LIVE synced-viewing page — it
                                        // deliberately shows a dead-end "Session Ended" screen once
                                        // that party's status is 'ended', it doesn't replay content.
                                        // /movie/{key} is the actual on-demand catalog player, which
                                        // is what "Watch Now"/individual film rows should open once
                                        // the live event itself is over.
                                        onWatch={key => navigate(`/movie/${key}?play=true`)}
                                    />
                                );
                            }) : (
                                <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-gray-700 text-xs uppercase tracking-widest font-black">Programme coming soon</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeSection === 'directors' && (
                    <div className="space-y-4">
                        {filmsWithNotes.length > 0
                            ? filmsWithNotes.map(m => <DirectorCard key={m.key} movie={m} />)
                            : (
                                <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-gray-700 text-xs uppercase tracking-widest font-black">Filmmaker notes coming soon</p>
                                </div>
                            )}
                    </div>
                )}
            </div>

            {ticketFlowBlock && (() => {
                const first = movies[ticketFlowBlock.movieKeys?.[0]];
                const bMovie: Movie = { key: ticketFlowBlock.id, title: ticketFlowBlock.title, isWatchPartyEnabled: true, isWatchPartyPaid: (ticketFlowBlock.price || 0) > 0, watchPartyPrice: ticketFlowBlock.price, poster: first?.poster || '', director: first?.director || 'Festival Event', synopsis: '', cast: [], trailer: '', fullMovie: first?.fullMovie || '', tvPoster: '', likes: 0 };
                return <FestivalTicketFlow block={ticketFlowBlock} blockMovie={bMovie}
                    onClose={() => setTicketFlowBlock(null)}
                    onSuccess={() => { setTicketFlowBlock(null); setShowLobbyFor(ticketFlowBlock.id); }}
                />;
            })()}

            {lobbyMovie && showLobbyFor && (() => {
                const lobbyBlock = allBlocks.find(b => b.id === showLobbyFor);
                const lobbyBlockFilms = lobbyBlock ? (lobbyBlock.movieKeys || []).map((k: string) => movies[k]).filter(Boolean) : [];
                return (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <WatchPartyLobby
                        movie={lobbyMovie}
                        movieKey={showLobbyFor}
                        partyState={activeParties[showLobbyFor]}
                        onPartyStart={() => { setShowLobbyFor(null); navigate(`/watchparty/${showLobbyFor}?skipLobby=1`); }}
                        user={user}
                        hasAccess={hasFestivalAllAccess || unlockedFestivalBlockIds.has(showLobbyFor) || unlockedWatchPartyKeys.has(showLobbyFor)}
                        onBuyTicket={() => { const b = allBlocks.find(bl => bl.id === showLobbyFor); if (b) { setShowLobbyFor(null); setTicketFlowBlock(b); } }}
                        onClose={() => setShowLobbyFor(null)}
                        blockFilms={lobbyBlockFilms}
                    />
                </div>
                );
            })()}
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
    // First festival was 2014 — so 2014=1st, 2026=13th, 2027=14th
    const foundingYear = settings?.pwffFoundingYear || 2014;
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
    const { settings, isLoading, livePartyMovie, activeParties, allPartyStates, festivalData, movies } = useFestival();
    const { unlockedWatchPartyKeys, unlockedFestivalBlockIds, hasFestivalAllAccess, user, authInitialized } = useAuth();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [showLobbyFor, setShowLobbyFor] = useState<string | null>(null);
    const [ticketFlowBlock, setTicketFlowBlock] = useState<FilmBlock | null>(null);

    useEffect(() => { trackPageView(); }, []);

    const showBanner = !!livePartyMovie && !bannerDismissed;

    // Find the block associated with the live party movie
    const liveBlock = useMemo(() => {
        if (!livePartyMovie) return null;
        return festivalData.flatMap(d => d.blocks || []).find(b => b.id === livePartyMovie.key || b.movieKeys.includes(livePartyMovie.key)) || null;
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

    if (isLoading || !authInitialized) return (
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
                        onBuyTicket={() => { if (liveBlock) { setShowLobbyFor(null); setTicketFlowBlock(liveBlock); } }}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}
            {/* This page renders standalone (outside <App>), so it never got the
                shared site header — meaning tablet/desktop visitors (768px+,
                where the mobile bottom nav hides) had literally no navigation
                at all: no logo, no way back to the main site, nothing. */}
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <BottomNavBar onSearchClick={() => {}} />
        </>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* The site-wide LiveWatchPartyBanner used to render here too, but
                this page already has its own "Live Now / Up Next" strip plus
                per-block live/ended badges (see ProgrammeMode) — the extra
                banner was pure duplication, and showed as a thin, mostly-empty
                bar above content that already said the same thing. */}

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
                        onBuyTicket={() => { if (liveBlock) { setShowLobbyFor(null); setTicketFlowBlock(liveBlock); } }}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}
            {/* This page renders standalone (outside <App>), so it never got the
                shared site header — meaning tablet/desktop visitors (768px+,
                where the mobile bottom nav hides) had literally no navigation
                at all: no logo, no way back to the main site, nothing. */}
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default PwffPage;
