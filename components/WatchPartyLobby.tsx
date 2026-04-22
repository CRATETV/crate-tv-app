import React, { useState, useEffect, useMemo } from 'react';
import { Movie, WatchPartyState } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { avatars } from './avatars';

// Auto-transitions into the party after 1.5s — fixes "Starting Now" getting stuck on slow devices
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
    const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [directorMessage, setDirectorMessage] = useState<string | null>(null);
    const [showFinalCountdown, setShowFinalCountdown] = useState(false);
    const [ambientPhase, setAmbientPhase] = useState(0);

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;

    // Register viewer presence in lobby
    useEffect(() => {
        if (!user) return;
        const db = getDbInstance();
        if (!db) return;

        const viewerRef = db.collection('watch_parties').doc(movie.key).collection('lobby_viewers').doc(user.email || 'anon');
        
        // Set viewer presence
        viewerRef.set({
            name: user.name || 'Film Lover',
            avatar: user.avatar || 'fox',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Remove on disconnect
        return () => {
            viewerRef.delete();
        };
    }, [user, movie.key]);

    // Listen to lobby viewers
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsub = db.collection('watch_parties').doc(movie.key).collection('lobby_viewers')
            .orderBy('joinedAt', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const v: LobbyViewer[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    v.push({
                        id: doc.id,
                        name: data.name,
                        avatar: data.avatar,
                        joinedAt: data.joinedAt?.toDate() || new Date()
                    });
                });
                setViewers(v);
            });

        return () => unsub();
    }, [movie.key]);

    // Listen for director welcome message
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const unsub = db.collection('watch_parties').doc(movie.key).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data?.directorWelcome) {
                    setDirectorMessage(data.directorWelcome);
                }
            }
        });

        return () => unsub();
    }, [movie.key]);

    // Countdown timer
    useEffect(() => {
        if (!startTime) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const target = startTime.getTime();
            const diff = target - now;

            if (diff <= 0) {
                setCountdown(null);
                // Final 10 second countdown already handled, transition to party
                if (diff < -1000) {
                    onPartyStart();
                }
                return;
            }

            // Show dramatic final countdown for last 10 seconds
            if (diff <= 10000 && diff > 0) {
                setShowFinalCountdown(true);
            }

            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [startTime, onPartyStart]);

    // Ambient animation phase
    useEffect(() => {
        const interval = setInterval(() => {
            setAmbientPhase(p => (p + 1) % 4);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // If party is live — paid users transition in, unpaid see paywall
    if (partyState?.status === 'live') {
        if (!hasAccess) {
            // Don't call onPartyStart — keep them on this screen showing paywall
            return (
                <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-8">
                    <div className="text-center space-y-6 max-w-sm w-full animate-[fadeIn_0.5s_ease-out]">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                            <span className="text-red-500 text-2xl">🎬</span>
                        </div>
                        <div>
                            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">Transmission Active</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">{movie.title}</h2>
                            <p className="text-gray-500 text-sm mt-2">The watch party has started. Unlock admission to join.</p>
                        </div>
                        {onBuyTicket && (
                            <button
                                onClick={onBuyTicket}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
                            >
                                Unlock Admission // ${movie.watchPartyPrice?.toFixed(2) ?? '50.00'}
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        // Paid users — show starting transition then enter
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-6 animate-pulse">
                    <div className="text-red-500 text-8xl">▶</div>
                    <p className="text-2xl font-black uppercase tracking-widest">Starting Now</p>
                    <StartingNowTransition onPartyStart={onPartyStart} />
                </div>
            </div>
        );
    }

    // Final 10 second countdown
    if (showFinalCountdown && countdown && countdown.seconds <= 10 && countdown.minutes === 0 && countdown.hours === 0 && countdown.days === 0) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                {/* Dramatic background pulse */}
                <div className="absolute inset-0 bg-gradient-radial from-red-900/20 via-black to-black animate-pulse" />
                
                <div className="relative text-center space-y-8">
                    <p className="text-red-500 text-sm font-black uppercase tracking-[0.5em] animate-pulse">Transmission Imminent</p>
                    <div className="text-[12rem] md:text-[20rem] font-black text-white leading-none tabular-nums animate-[pulse_1s_ease-in-out_infinite]">
                        {countdown.seconds}
                    </div>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{movie.title}</p>
                </div>
            </div>
        );
    }

    // ── RED CARPET MODE — last 10 minutes before showtime ──────────────────
    const isRedCarpetWindow = countdown &&
        countdown.days === 0 &&
        countdown.hours === 0 &&
        countdown.minutes < 10;

    if (isRedCarpetWindow) {
        return (
            <div className="fixed inset-0 bg-black z-40 overflow-hidden">
                {/* Film grain */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}>
                </div>

                {/* Blurred poster backdrop */}
                <div className="absolute inset-0">
                    <img src={movie.poster} alt="" className="w-full h-full object-cover opacity-[0.08] blur-3xl scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80" />
                </div>

                {/* Red top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 z-20"></div>

                {/* Top strip */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 md:px-12 py-5">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-400">Virtual Red Carpet</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {viewers.slice(0, 5).map((v, i) => (
                                <div key={v.id} className="w-6 h-6 rounded-full bg-gray-800 border-2 border-black"
                                    style={{ zIndex: 5 - i }}
                                    dangerouslySetInnerHTML={{ __html: avatars[v.avatar] || avatars['fox'] }}
                                />
                            ))}
                        </div>
                        {viewers.length > 0 && (
                            <span className="text-xs font-bold text-white ml-1">{viewers.length} here</span>
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-600 mb-6">
                        {movie.director && `Directed by ${movie.director}`}
                    </p>

                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-white mb-4 italic">
                        {movie.title}
                    </h1>

                    <div className="w-16 h-0.5 bg-red-600 mb-8"></div>

                    {/* Countdown */}
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4">Screening Begins In</p>
                    <div className="flex items-center gap-3 mb-12">
                        <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <div className="text-4xl md:text-6xl font-black text-red-500 tabular-nums">{String(countdown.minutes).padStart(2, '0')}</div>
                            <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Min</div>
                        </div>
                        <span className="text-3xl font-black text-gray-700">:</span>
                        <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 min-w-[80px]">
                            <div className="text-4xl md:text-6xl font-black text-red-500 tabular-nums animate-pulse">{String(countdown.seconds).padStart(2, '0')}</div>
                            <div className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">Sec</div>
                        </div>
                    </div>

                    {/* Director message if set */}
                    {directorMessage && (
                        <div className="border-l-2 border-red-600 pl-5 text-left max-w-sm mb-10">
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-2">From the Director</p>
                            <p className="text-gray-400 italic text-sm leading-relaxed">"{directorMessage}"</p>
                            <p className="text-gray-700 text-[10px] mt-2">— {movie.director}</p>
                        </div>
                    )}

                    {/* Admission prompt */}
                    {!hasAccess && onBuyTicket && (
                        <button
                            onClick={onBuyTicket}
                            className="bg-red-600 hover:bg-red-700 text-white font-black px-10 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl"
                        >
                            Unlock Admission — ${movie.watchPartyPrice?.toFixed(2) ?? '50.00'}
                        </button>
                    )}

                    {hasAccess && (
                        <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                            You're in — film starts automatically
                        </p>
                    )}
                </div>

                {/* Bottom PWFF badge */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 px-5 py-2.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Playhouse West Film Festival</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Crate TV</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-40 overflow-hidden">
            {/* Ambient background with poster */}
            <div className="absolute inset-0">
                <img 
                    src={movie.poster} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover opacity-10 blur-3xl scale-110 transition-all duration-[3000ms]"
                    style={{ transform: `scale(${1.1 + ambientPhase * 0.02})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
                
                {/* Subtle animated grain */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
            </div>

            {/* Main content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
                
                {/* Top bar - CRATE branding */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">CRATE Watch Party</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg transition-colors" aria-label="Close lobby">
                            &times;
                        </button>
                    )}
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <div className="flex -space-x-2">
                            {viewers.slice(0, 5).map((v, i) => (
                                <div 
                                    key={v.id} 
                                    className="w-6 h-6 rounded-full bg-gray-800 border-2 border-black p-0.5"
                                    style={{ zIndex: 5 - i }}
                                    dangerouslySetInnerHTML={{ __html: avatars[v.avatar] || avatars['fox'] }}
                                    title={v.name}
                                />
                            ))}
                        </div>
                        <span className="text-sm font-bold text-white ml-2">{viewers.length}</span>
                        <span className="text-xs text-gray-500">waiting</span>
                    </div>
                </div>

                {/* Center content */}
                <div className="text-center max-w-2xl mx-auto space-y-12">
                    {/* Film poster - slowly revealing */}
                    <div className="relative mx-auto w-48 md:w-64">
                        <div className="absolute -inset-4 bg-gradient-to-br from-red-500/20 to-transparent rounded-2xl blur-xl opacity-50" />
                        <img 
                            src={movie.poster} 
                            alt={movie.title} 
                            className="relative w-full rounded-xl shadow-2xl border border-white/10"
                        />
                    </div>

                    {/* Title */}
                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">{movie.title}</h1>
                        <p className="text-red-500 font-black uppercase tracking-[0.3em] text-xs">Directed by {movie.director}</p>
                    </div>

                    {/* Countdown */}
                    {countdown && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Screening Begins In</p>
                            <div className="flex justify-center gap-3 md:gap-6">
                                {countdown.days > 0 && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 md:px-8 py-4 md:py-6">
                                        <div className="text-3xl md:text-5xl font-black text-white tabular-nums">{countdown.days}</div>
                                        <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Days</div>
                                    </div>
                                )}
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 md:px-8 py-4 md:py-6">
                                    <div className="text-3xl md:text-5xl font-black text-white tabular-nums">{String(countdown.hours).padStart(2, '0')}</div>
                                    <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Hours</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 md:px-8 py-4 md:py-6">
                                    <div className="text-3xl md:text-5xl font-black text-red-500 tabular-nums">{String(countdown.minutes).padStart(2, '0')}</div>
                                    <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Min</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 md:px-8 py-4 md:py-6">
                                    <div className="text-3xl md:text-5xl font-black text-red-500 tabular-nums animate-pulse">{String(countdown.seconds).padStart(2, '0')}</div>
                                    <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Sec</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Director welcome message */}
                    {directorMessage && (
                        <div className="bg-gradient-to-r from-red-900/20 via-red-900/10 to-transparent border-l-2 border-red-500 p-6 rounded-r-xl text-left max-w-md mx-auto animate-[fadeIn_0.5s_ease-out]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Message from the Director</p>
                            <p className="text-gray-300 italic">"{directorMessage}"</p>
                            <p className="text-gray-600 text-xs mt-2">— {movie.director}</p>
                        </div>
                    )}

                    {/* Ticket purchase prompt for unpaid users */}
                    {!hasAccess && onBuyTicket && (
                        <div className="animate-[fadeIn_0.8s_ease-out] space-y-3 max-w-sm mx-auto">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Admission Required</p>
                                <p className="text-gray-400 text-sm">Secure your seat before the party starts.</p>
                                <button
                                    onClick={onBuyTicket}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
                                >
                                    Unlock Admission // ${movie.watchPartyPrice?.toFixed(2) ?? '50.00'}
                                </button>
                                <p className="text-gray-700 text-[10px]">Films unlock after the Watch Party ends.</p>
                            </div>
                        </div>
                    )}

                    {/* Confirmed access badge */}
                    {hasAccess && (
                        <div className="text-center animate-[fadeIn_0.5s_ease-out]">
                            <span className="inline-flex items-center gap-2 bg-green-900/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Admission Confirmed
                            </span>
                        </div>
                    )}
                </div>

                {/* Bottom - Viewers arriving */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="max-w-2xl mx-auto">
                        {/* Recent arrivals ticker */}
                        {viewers.length > 0 && (
                            <div className="text-center space-y-4">
                                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                                    <span className="w-8 h-px bg-white/10" />
                                    <span className="uppercase tracking-widest">Audience Gathering</span>
                                    <span className="w-8 h-px bg-white/10" />
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {viewers.slice(0, 12).map(v => (
                                        <div 
                                            key={v.id}
                                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1 animate-[fadeIn_0.5s_ease-out]"
                                        >
                                            <div 
                                                className="w-6 h-6 rounded-full bg-gray-800 p-0.5"
                                                dangerouslySetInnerHTML={{ __html: avatars[v.avatar] || avatars['fox'] }}
                                            />
                                            <span className="text-xs text-gray-400">{v.name}</span>
                                        </div>
                                    ))}
                                    {viewers.length > 12 && (
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1">
                                            <span className="text-xs text-gray-400">+{viewers.length - 12} more</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPartyLobby;
