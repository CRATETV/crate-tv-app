import React, { useState, useEffect } from 'react';
import { Movie, WatchPartyState } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { avatars } from './avatars';

const StartingNowTransition: React.FC<{ onPartyStart: () => void }> = ({ onPartyStart }) => {
    useEffect(() => {
        const t = setTimeout(() => onPartyStart(), 1500);
        return () => clearTimeout(t);
    }, [onPartyStart]);
    return null;
};

interface WatchPartyLobbyProps {
    movie: Movie;
    partyState?: WatchPartyState;
    onPartyStart: () => void;
    user: { name?: string; email: string | null; avatar?: string } | null;
    hasAccess?: boolean;
    onBuyTicket?: () => void;
    onClose?: () => void;
}

interface LobbyViewer {
    id: string;
    name: string;
    avatar: string;
    joinedAt: Date;
}

const WatchPartyLobby: React.FC<WatchPartyLobbyProps> = ({ movie, partyState, onPartyStart, user, hasAccess = true, onBuyTicket, onClose }) => {
    const [viewers, setViewers] = useState<LobbyViewer[]>([]);
    const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number; total: number } | null>(null);
    const [directorMessage, setDirectorMessage] = useState<string | null>(null);
    const [finalCount, setFinalCount] = useState<number | null>(null);

    // Use watchPartyStartTime OR screeningStartTime — whichever the admin set
    const startTimeStr = (movie as any).watchPartyStartTime || (movie as any).screeningStartTime || null;
    const startTime = startTimeStr ? new Date(startTimeStr) : null;

    // Register viewer presence
    useEffect(() => {
        if (!user) return;
        const db = getDbInstance();
        if (!db) return;
        const viewerRef = db.collection('watch_parties').doc(movie.key).collection('lobby_viewers').doc(user.email || 'anon');
        viewerRef.set({
            name: user.name || 'Film Lover',
            avatar: user.avatar || 'fox',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const logRef = db.collection('festival_viewers').doc(`${movie.key}_${user.email || 'anon'}`);
        // userId is REQUIRED to match Firestore security rules (request.resource.data.userId == request.auth.uid)
        logRef.set({
            userId: user.uid || null,
            movieKey: movie.key,
            movieTitle: movie.title,
            email: user.email || null,
            name: user.name || 'Film Lover',
            firstJoinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return () => { viewerRef.delete(); };
    }, [user, movie.key]);

    // Listen to lobby viewers
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').doc(movie.key).collection('lobby_viewers')
            .orderBy('joinedAt', 'desc').limit(50)
            .onSnapshot(snapshot => {
                const v: LobbyViewer[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    v.push({ id: doc.id, name: data.name, avatar: data.avatar, joinedAt: data.joinedAt?.toDate() || new Date() });
                });
                setViewers(v);
            });
        return () => unsub();
    }, [movie.key]);

    // Listen for director message
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').doc(movie.key).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data?.directorWelcome) setDirectorMessage(data.directorWelcome);
            }
        });
        return () => unsub();
    }, [movie.key]);

    // Countdown timer
    useEffect(() => {
        if (!startTime) return;
        const update = () => {
            const diff = startTime.getTime() - Date.now();
            if (diff <= 0) {
                setCountdown(null);
                if (diff <= 10000) setFinalCount(null);
                if (diff < -1000) onPartyStart();
                return;
            }
            if (diff <= 10000) {
                setFinalCount(Math.ceil(diff / 1000));
                return;
            }
            setCountdown({
                total: diff,
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime, onPartyStart]);

    // ── PARTY IS LIVE ────────────────────────────────────────────────────────
    if (partyState?.status === 'live') {
        if (!hasAccess) {
            return (
                <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-8">
                    <div className="text-center space-y-6 max-w-sm w-full">
                        <h2 className="text-4xl font-black uppercase tracking-tighter">{movie.title}</h2>
                        <p className="text-gray-500 text-sm">The watch party has started.</p>
                        {onBuyTicket && (
                            <button onClick={onBuyTicket} className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all">
                                Unlock Admission // ${movie.watchPartyPrice?.toFixed(2) ?? '50.00'}
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Entering watch party</p>
                    <StartingNowTransition onPartyStart={onPartyStart} />
                </div>
            </div>
        );
    }

    // ── FINAL 10-SECOND COUNTDOWN ────────────────────────────────────────────
    if (finalCount !== null) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img src={movie.poster} alt="" className="w-full h-full object-cover opacity-10 blur-3xl scale-110" />
                    <div className="absolute inset-0 bg-black/80" />
                </div>
                <div className="relative text-center space-y-6">
                    <p className="text-red-500 text-xs font-black uppercase tracking-[0.5em] animate-pulse">Transmission Imminent</p>
                    <div className="text-[18rem] font-black text-white leading-none tabular-nums" style={{ textShadow: '0 0 120px rgba(239,68,68,0.4)' }}>
                        {finalCount}
                    </div>
                    <p className="text-gray-600 text-xs uppercase tracking-widest">{movie.title}</p>
                </div>
            </div>
        );
    }

    // ── MAIN LOBBY ──────────────────────────────────────────────────────────
    const isUnder10Min = countdown && countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 10;

    return (
        <div className="fixed inset-0 bg-black z-40 overflow-hidden">

            {/* Full-bleed poster backdrop */}
            <div className="absolute inset-0">
                <img src={movie.poster} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
                {/* Film grain */}
                <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-400">Crate Watch Party</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Viewer count pill */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                        <div className="flex -space-x-1.5">
                            {viewers.slice(0, 4).map((v, i) => (
                                <div key={v.id} className="w-5 h-5 rounded-full bg-gray-800 border border-black p-0.5" style={{ zIndex: 4 - i }}
                                    dangerouslySetInnerHTML={{ __html: avatars[v.avatar] || avatars['fox'] }} />
                            ))}
                        </div>
                        <span className="text-xs font-black text-white">{viewers.length}</span>
                        <span className="text-[10px] text-gray-500">waiting</span>
                    </div>
                    {/* Share */}
                    <button onClick={() => {
                        const url = window.location.href;
                        if (navigator.share) navigator.share({ title: `Watch ${movie.title} on Crate TV`, url });
                        else { navigator.clipboard?.writeText(url); }
                    }} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                        Share ↗
                    </button>
                    {/* Close */}
                    {onClose && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg transition-colors">
                            &times;
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN LAYOUT — two column on desktop, stacked on mobile */}
            <div className="relative z-10 h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-6 md:px-16 pt-20 pb-8">

                {/* LEFT — Poster */}
                <div className="flex-shrink-0 relative">
                    <div className="absolute -inset-6 bg-gradient-to-br from-red-500/20 to-transparent rounded-3xl blur-2xl" />
                    <img
                        src={movie.poster}
                        alt={movie.title}
                        className="relative w-44 md:w-64 lg:w-72 rounded-2xl shadow-2xl border border-white/10 object-cover"
                        style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' }}
                    />
                    {/* Now screening badge */}
                    {isUnder10Min && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse whitespace-nowrap">
                            Starting Soon
                        </div>
                    )}
                </div>

                {/* RIGHT — Info + Countdown */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 max-w-lg">

                    {/* Festival label */}
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-red-500">
                        Playhouse West Film Festival - Philadelphia · 2026
                    </p>

                    {/* Title */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none text-white italic">
                        {movie.title}
                    </h1>

                    {/* Director */}
                    {movie.director && (
                        <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em]">
                            Directed by {movie.director}
                        </p>
                    )}

                    <div className="w-12 h-0.5 bg-red-600" />

                    {/* ── COUNTDOWN ── */}
                    {countdown ? (
                        <div className="space-y-3 w-full">
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-600">
                                {isUnder10Min ? '⚡ Screening begins in' : 'Screening begins in'}
                            </p>
                            <div className="flex items-center gap-2 md:gap-3">
                                {countdown.days > 0 && (
                                    <>
                                        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[64px]">
                                            <span className="text-3xl md:text-4xl font-black text-white tabular-nums">{String(countdown.days).padStart(2, '0')}</span>
                                            <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Days</span>
                                        </div>
                                        <span className="text-2xl font-black text-gray-700 mb-4">:</span>
                                    </>
                                )}
                                <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[64px]">
                                    <span className="text-3xl md:text-4xl font-black text-white tabular-nums">{String(countdown.hours).padStart(2, '0')}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Hrs</span>
                                </div>
                                <span className="text-2xl font-black text-gray-700 mb-4">:</span>
                                <div className={`flex flex-col items-center rounded-2xl px-4 py-3 min-w-[64px] ${isUnder10Min ? 'bg-red-600/20 border border-red-500/40' : 'bg-white/5 border border-white/10'}`}>
                                    <span className={`text-3xl md:text-4xl font-black tabular-nums ${isUnder10Min ? 'text-red-400' : 'text-white'}`}>{String(countdown.minutes).padStart(2, '0')}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Min</span>
                                </div>
                                <span className="text-2xl font-black text-gray-700 mb-4">:</span>
                                <div className={`flex flex-col items-center rounded-2xl px-4 py-3 min-w-[64px] ${isUnder10Min ? 'bg-red-600/20 border border-red-500/40' : 'bg-white/5 border border-white/10'}`}>
                                    <span className={`text-3xl md:text-4xl font-black tabular-nums animate-pulse ${isUnder10Min ? 'text-red-400' : 'text-white'}`}>{String(countdown.seconds).padStart(2, '0')}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Sec</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-600">Screening time not set</p>
                        </div>
                    )}

                    {/* Admission status */}
                    {hasAccess ? (
                        <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Admission Confirmed · Film starts automatically
                        </div>
                    ) : onBuyTicket && (
                        <div className="space-y-3 w-full max-w-sm">
                            <button onClick={onBuyTicket} className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-2xl">
                                Unlock Admission // ${movie.watchPartyPrice?.toFixed(2) ?? '50.00'}
                            </button>
                            <p className="text-gray-700 text-[10px] text-center">Films available to rewatch for 7 days after the screening.</p>
                        </div>
                    )}

                    {/* Director message */}
                    {directorMessage && (
                        <div className="border-l-2 border-red-600 pl-4 max-w-sm animate-[fadeIn_0.5s_ease-out]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">From the Director</p>
                            <p className="text-gray-400 italic text-sm leading-relaxed">"{directorMessage}"</p>
                            <p className="text-gray-600 text-[10px] mt-1.5">— {movie.director}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM — Audience strip */}
            {viewers.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 border-t border-white/5 bg-black/40 backdrop-blur-sm"
                    style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 flex-shrink-0">Audience</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {viewers.slice(0, 16).map(v => (
                                <div key={v.id} className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full pl-0.5 pr-2.5 py-0.5 animate-[fadeIn_0.3s_ease-out] flex-shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-gray-800 p-0.5"
                                        dangerouslySetInnerHTML={{ __html: avatars[v.avatar] || avatars['fox'] }} />
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{v.name}</span>
                                </div>
                            ))}
                            {viewers.length > 16 && (
                                <span className="text-[10px] text-gray-600 flex-shrink-0">+{viewers.length - 16} more</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PWFF badge bottom right */}
            <div className="absolute bottom-4 right-6 z-20 hidden md:block">
                <div className="flex items-center gap-2 opacity-30">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">PWFF · Crate TV</span>
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                </div>
            </div>
        </div>
    );
};

export default WatchPartyLobby;
