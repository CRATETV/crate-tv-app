
import { toast } from './Toast';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';
import WatchPartyLobby from './WatchPartyLobby';
import WatchPartyCredits from './WatchPartyCredits';
import IntermissionScreen from './IntermissionScreen';
import SessionKickedScreen from './SessionKickedScreen';
import { useSessionGuard } from '../hooks/useSessionGuard';

interface WatchPartyPageProps {
  movieKey: string;
}

const REACTION_TYPES = ['🔥', '😲', '❤️', '👏', '😢'] as const;

/**
 * LIVE RELAY ENGINE V4.5
 * Automatically converts browser URLs from major platforms into secure full-screen iframes.
 * Support Added: Restream.io Player
 */
const processLiveEmbed = (input: string, startTimeOffset: number = 0): string => {
    const trimmed = input.trim();
    const startSec = Math.max(0, Math.floor(startTimeOffset));
    
    // 1. RAW IFRAME PASSTHROUGH
    if (trimmed.startsWith('<iframe')) return trimmed;

    // 2. YOUTUBE RECOGNITION
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = trimmed.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0${startSec > 0 ? `&start=${startSec}` : ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 3. VIMEO RECOGNITION
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = trimmed.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ef4444&title=0&byline=0&portrait=0${startSec > 0 ? `#t=${startSec}s` : ''}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    // 4. RESTREAM.IO RECOGNITION
    if (trimmed.includes('restream.io/player/')) {
        const restreamId = trimmed.split('/player/')[1]?.split('?')[0];
        if (restreamId) {
            return `<iframe src="https://restream.io/player/${restreamId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
        }
    }

    // 5. GENERIC URL WRAPPER (FALLBACK)
    if (trimmed.startsWith('http')) {
        return `<iframe src="${trimmed}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    return `<div class="flex items-center justify-center h-full text-gray-500 font-mono text-xs uppercase p-10 text-center">Invalid Relay Node: ${trimmed}</div>`;
};

const FloatingReaction = React.memo<{ emoji: string; onComplete: () => void }>(({ emoji, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 80) + 10, []); 
    const randomDuration = useMemo(() => 3.5 + Math.random() * 1.5, []); 
    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);
    return (
        <div className="absolute bottom-24 pointer-events-none z-[120] animate-emoji-float text-6xl drop-shadow-2xl" style={{ left: `${randomLeft}%`, animationDuration: `${randomDuration}s` }}>{emoji}</div>
    );
});

const EmbeddedChat = React.memo<{ partyKey: string; directors: string[]; isQALive?: boolean; user: any; isMobileController?: boolean; isBackstageVerified?: boolean; onBackstageVerify?: (key: string) => void }>(({ partyKey, directors, isQALive, user, isMobileController, isBackstageVerified, onBackstageVerify }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [showQABanner, setShowQABanner] = useState(false);

    // Show Q&A banner animation when Q&A goes live
    useEffect(() => {
        if (isQALive) {
            setShowQABanner(true);
            const timer = setTimeout(() => setShowQABanner(false), 8000);
            return () => clearTimeout(timer);
        }
    }, [isQALive]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const messagesRef = db.collection('watch_parties').doc(partyKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(100);
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => { fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage); });
            setMessages(fetchedMessages);
        });
        return () => unsubscribe();
    }, [partyKey]);

    // Auto-scroll to the newest message. This used to call
    // messagesEndRef.current.scrollIntoView(), which asks the browser to
    // bring that element into view by scrolling whatever ancestor chain it
    // takes to do so — on desktop that could nudge the outer page/layout by
    // a few pixels on every single incoming message, which is very visible
    // when chat is active. Scrolling the chat's own container directly
    // instead stays fully contained inside that one div.
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        setIsSending(true);
        try {
            await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey: partyKey, 
                    userName: user.name || user.email, 
                    userAvatar: user.avatar || 'fox', 
                    text: newMessage,
                    isVerifiedDirector: isBackstageVerified
                }),
            });
            setNewMessage('');
        } catch (error) { console.error("Chat error:", error); } finally { setIsSending(false); }
    };

    return (
        <div 
            className={`w-full h-full flex flex-col ${isMobileController ? 'bg-black' : 'bg-[#0a0a0a] md:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800'} overflow-hidden min-h-0`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Q&A Live Banner */}
            {isQALive && (
                <div className={`bg-gradient-to-r from-amber-600 via-red-600 to-purple-600 px-4 py-2 flex items-center justify-center gap-2 animate-pulse flex-shrink-0 ${showQABanner ? 'animate-[pulse_0.5s_ease-in-out_3]' : ''}`}>
                    <span className="text-xl">🎤</span>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">Director Q&A is Live!</span>
                    <span className="text-xl">🎬</span>
                </div>
            )}
            
            {isMobileController && (
                <div className="p-4 bg-red-600/10 border-b border-red-500/20 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-red-500">Roku Controller Node</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                </div>
            )}
            <div ref={messagesContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
                {/* Director Backstage Verification */}
                {!isBackstageVerified && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Are you the Director?</p>
                        <button 
                            onClick={() => {
                                const key = window.prompt("Enter your Backstage Key to join as Director:");
                                if (key && onBackstageVerify) onBackstageVerify(key);
                            }}
                            className="text-[10px] font-black text-red-500 hover:text-white transition-colors uppercase tracking-tighter"
                        >
                            Enter Backstage Key →
                        </button>
                    </div>
                )}
                
                {/* Backstage Verified Badge */}
                {isBackstageVerified && (
                    <div className="bg-gradient-to-r from-red-600/20 to-purple-600/20 border border-red-500/30 rounded-2xl p-3 mb-4 flex items-center gap-2">
                        <span className="text-lg">🎬</span>
                        <div>
                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Director Mode Active</p>
                            <p className="text-[8px] text-gray-400">Your messages will be highlighted</p>
                        </div>
                    </div>
                )}
                
                {messages.map(msg => (
                    msg.isSystemMessage ? (
                        // System message (Q&A announcements, etc.)
                        <div key={msg.id} className="bg-gradient-to-r from-amber-600/20 via-red-600/20 to-purple-600/20 border border-amber-500/30 rounded-xl p-3 text-center animate-[fadeIn_0.3s_ease-out]">
                            <p className="text-sm font-bold text-white">{msg.text}</p>
                        </div>
                    ) : (
                        <div 
                            key={msg.id} 
                            className={`flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] ${msg.isVerifiedDirector ? 'bg-gradient-to-r from-red-600/10 to-purple-600/10 -mx-4 px-4 py-3 border-l-2 border-red-500' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 p-1 ${msg.isVerifiedDirector ? 'border-2 border-red-500 bg-red-900/50' : 'border border-white/5 bg-gray-800'}`} dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`font-black text-[11px] uppercase tracking-tighter ${msg.isVerifiedDirector ? 'text-red-400' : 'text-red-500'}`}>{msg.userName}</p>
                                    {msg.isVerifiedDirector && (
                                        <span className="bg-gradient-to-r from-red-600 to-purple-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                                            <span>🎬</span> Director
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm break-words leading-snug ${msg.isVerifiedDirector ? 'text-white font-medium' : 'text-gray-300'}`}>{msg.text}</p>
                            </div>
                        </div>
                    )
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
                <div className={`flex items-center gap-2 rounded-full px-4 py-1 border ${isBackstageVerified ? 'bg-red-900/30 border-red-500/30' : 'bg-gray-800/80 border-white/10'}`}>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={isBackstageVerified ? "Answer a question..." : (isQALive ? "Ask the director a question..." : "Type a message...")} className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    <button type="submit" className={isBackstageVerified ? "text-red-400" : "text-red-500"} disabled={!user || isSending || !newMessage.trim()}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
});

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty, unlockFestivalBlock, rentals, likedMovies: likedMoviesArray, toggleLikeMovie, hasFestivalAllAccess, unlockedFestivalBlockIds } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading, festivalData } = useFestival();
    const [partyState, setPartyState] = useState<WatchPartyState>();
    // True once we've received a real Firestore snapshot for this party. Used to
    // avoid mounting the block's <video> at the wrong film (index 0) for the brief
    // window after a remount — e.g. iOS reloading the tab after backgrounding —
    // before we know which film is actually active.
    const [partyStateReady, setPartyStateReady] = useState(false);
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    const [showPaywall, setShowPaywall] = useState(false);

    // Detect if this watch party is for a festival block (movieKey === block.id)
    const parentBlock = useMemo(() =>
        festivalData.flatMap((d: any) => d.blocks || []).find((b: any) => b.id === movieKey) || null,
        [festivalData, movieKey]
    );

    // ── NEXT BLOCK LOOKUP — for the "thank you" screen at the end of a block ──
    // Finds the next chronologically-scheduled block so we can tell full-pass
    // holders when it starts, and prompt everyone else to buy a ticket for it.
    const nextBlockInfo = useMemo(() => {
        if (!parentBlock) return null;
        const currentStart = parentBlock.screeningStartTime || (parentBlock as any).watchPartyStartTime;
        if (!currentStart) return null;
        const currentTime = new Date(currentStart).getTime();
        if (isNaN(currentTime)) return null;

        const allBlocks = festivalData.flatMap((d: any) => d.blocks || []);
        const upcoming = allBlocks
            .filter((b: any) => b.id !== parentBlock.id)
            .map((b: any) => ({ block: b, start: new Date(b.screeningStartTime || b.watchPartyStartTime || 0).getTime() }))
            .filter((b: any) => !isNaN(b.start) && b.start > currentTime)
            .sort((a: any, b: any) => a.start - b.start);

        return upcoming.length > 0 ? upcoming[0].block : null;
    }, [parentBlock, festivalData]);

    const handleBuyNextBlock = useCallback(() => {
        if (!nextBlockInfo) return;
        window.history.pushState({}, '', `/watchparty/${nextBlockInfo.id}`);
        window.dispatchEvent(new Event('pushstate'));
    }, [nextBlockInfo]);

    // Correct unlock: blocks use unlockFestivalBlock, individual films use unlockWatchParty
    const handlePaymentSuccess = useCallback(() => {
        if (parentBlock) unlockFestivalBlock(parentBlock.id);
        else unlockWatchParty(movieKey);
        setShowPaywall(false);
    }, [parentBlock, movieKey, unlockFestivalBlock, unlockWatchParty]);
    const [backstageInput, setBackstageInput] = useState('');
    const [backstageError, setBackstageError] = useState(false);
    const [isBackstageVerified, setIsBackstageVerified] = useState(false);
    const [isEnded, setIsEnded] = useState(false);
    const [isControllerMode, setIsControllerMode] = useState(false);
    const [showLobby, setShowLobby] = useState(true);
    const [showCredits, setShowCredits] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(false); // start false — show player immediately
    const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleVideoWaiting = useCallback(() => {
        // Only show buffering overlay after 1.5s of sustained stall — avoids flashing on seeks
        bufferingTimerRef.current = setTimeout(() => setIsVideoBuffering(true), 1500);
    }, []);
    const handleVideoCanPlay = useCallback(() => {
        if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
        setIsVideoBuffering(false);
    }, []);
    const [needsUserGesture, setNeedsUserGesture] = useState(true);
    const [introPlaying, setIntroPlaying] = useState(false);
    const [introDone, setIntroDone] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    const lastSeekTimeRef = useRef<number>(0);
    // Stable refs so the sync interval never needs to be torn down on Firestore updates
    const partyStateRef = useRef<WatchPartyState | undefined>(undefined);
    const movieRef = useRef<typeof movie>(undefined);
    const isEndedRef = useRef<boolean>(false);
    const hasUserInteractedRef = useRef<boolean>(false); // mobile autoplay gate

    // ── BLOCK / SEQUENTIAL PLAYBACK STATE ───────────────────────────────
    const [intermissionSeconds, setIntermissionSeconds] = useState<number>(0);
    const isInIntermission = !!(partyState?.intermissionUntil && Date.now() < partyState.intermissionUntil);

    const isLiked = likedMoviesArray?.includes(movieKey) || false;
    const handleToggleLike = () => toggleLikeMovie(movieKey);

    const movie = useMemo(() => {
        if (allMovies[movieKey]) return allMovies[movieKey];
        
        // Check if it's a festival block
        const block = festivalData.flatMap(d => d.blocks).find(b => b.id === movieKey);
        if (block) {
            // Use activeMovieIndex from partyState to determine which film in the block is playing
            const idx = partyState?.activeMovieIndex ?? 0;
            const safeIdx = Math.min(idx, block.movieKeys.length - 1);
            const activeFilm = allMovies[block.movieKeys[safeIdx]] || null;

            return {
                key: block.id,
                title: block.title,
                watchPartyStartTime: block.screeningStartTime, // ← critical: blocks use screeningStartTime, not watchPartyStartTime
                isWatchPartyEnabled: true,
                isWatchPartyPaid: (block.price || 0) > 0,
                watchPartyPrice: block.price,
                director: activeFilm?.director || 'Festival Event',
                fullMovie: activeFilm?.fullMovie || '',
                isLiveStream: activeFilm?.isLiveStream || false,
                liveStreamEmbed: activeFilm?.liveStreamEmbed || '',
                poster: activeFilm?.poster || '',
                durationInMinutes: activeFilm?.durationInMinutes,
                // Pass block metadata for UI
                _blockMovieKeys: block.movieKeys,
                _blockTitle: block.title,
                _activeFilmTitle: activeFilm?.title || block.title,
                _activeFilmDirector: activeFilm?.director || 'Festival Event',
            } as Movie & { _blockMovieKeys?: string[]; _blockTitle?: string; _activeFilmTitle?: string; _activeFilmDirector?: string };
        }
        return null;
    }, [movieKey, allMovies, festivalData, partyState?.activeMovieIndex]);

    const handleBackstageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (partyState?.backstageKey && backstageInput.toUpperCase() === partyState.backstageKey.toUpperCase()) {
            unlockWatchParty(movieKey);
            setIsBackstageVerified(true);
            setBackstageError(false);
            setBackstageInput('');
        } else {
            setBackstageError(true);
            setTimeout(() => setBackstageError(false), 2000);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'controller') setIsControllerMode(true);
    }, []);

    // Keep movieRef and isEndedRef current without restarting the sync interval
    useEffect(() => { movieRef.current = movie; }, [movie]);
    useEffect(() => { isEndedRef.current = isEnded; }, [isEnded]);

    // ── SYNC ENGINE — runs once, reads state via refs so Firestore updates
    //    never tear down and restart the interval (which caused repeated seeks) ──
    useEffect(() => {
        if (isControllerMode) return;

        const syncClock = (opts?: { force?: boolean }) => {
            const video = videoRef.current;
            const ps = partyStateRef.current;
            const mv = movieRef.current;

            if (!video || !ps?.actualStartTime || mv?.isLiveStream) return;

            if (ps.status === 'ended' || ps.status !== 'live') {
                video.pause();
                return;
            }

            const now = Date.now();
            if (!opts?.force && now - lastSeekTimeRef.current < 2000) return;

            try {
                const startRef = ps.filmStartTime || ps.actualStartTime;
                const serverStart = (startRef as any).toDate().getTime();
                const elapsedSinceStart = (now - serverStart) / 1000;
                const targetPosition = Math.max(0, elapsedSinceStart);

                const movieDuration = mv?.durationInMinutes
                    ? mv.durationInMinutes * 60
                    : (video.duration > 0 ? video.duration : 3600);

                if (targetPosition >= movieDuration) {
                    if (!isEndedRef.current) {
                        setIsEnded(true);
                        video.pause();
                        video.currentTime = movieDuration;
                    }
                    return;
                }

                const drift = targetPosition - video.currentTime;
                const absDrift = Math.abs(drift);

                // Forced resync (tab just came back to the foreground): seek
                // immediately regardless of buffered readyState. A backgrounded
                // video can report a stale/zeroed currentTime on iOS, and waiting
                // for the readyState>=3 gate below made it look like playback had
                // silently reset to the start instead of catching back up.
                if (opts?.force && absDrift > 1.5 && !video.seeking) {
                    lastSeekTimeRef.current = now;
                    video.currentTime = targetPosition;
                    video.playbackRate = 1.0;
                } else if (absDrift > 8 && !video.seeking && video.readyState >= 3) {
                    // Only hard-seek if drift is large AND video has enough data
                    // Use a longer debounce (3s) to avoid repeated seeks on mobile
                    lastSeekTimeRef.current = now;
                    video.currentTime = targetPosition;
                    video.playbackRate = 1.0;
                } else if (absDrift > 0.5 && absDrift <= 8 && video.readyState >= 3) {
                    video.playbackRate = drift > 0 ? 1.06 : 0.94;
                } else {
                    video.playbackRate = 1.0;
                }

                // Play/pause — always try to play muted first (works without user gesture).
                // If user has interacted, unmute is handled by the unmute button.
                if (ps.isPlaying && video.paused && !video.ended && (video.readyState >= 2 || opts?.force)) {
                    if (!hasUserInteractedRef.current) {
                        video.muted = true; // ensure muted for autoplay
                    }
                    video.play().catch(() => {});
                } else if (!ps.isPlaying && !video.paused) {
                    video.pause();
                }
            } catch (e) { console.error('Sync heartbeat failure:', e); }
        };

        const interval = setInterval(() => syncClock(), 1500); // 1.5s — gentler cadence
        // Don't call syncClock() immediately on mount; let the video settle first
        const initialDelay = setTimeout(() => syncClock(), 3000);

        // ── FOREGROUND RESYNC ─────────────────────────────────────────────
        // iOS Safari throttles (or fully suspends) timers and video decoding
        // while a tab is backgrounded/screen is locked. When the user comes
        // back — e.g. after leaving the lobby tab and returning mid-film —
        // the interval above can take up to 1.5s to fire again, and by then
        // the video element may be sitting on a stale frame from whenever it
        // got suspended. This forces an immediate hard seek + resume instead
        // of waiting, so viewers land back on the live position rather than
        // appearing stuck (or looking like playback reset to frame one).
        const handleForegroundReturn = () => {
            if (document.visibilityState !== 'visible') return;
            const video = videoRef.current;
            if (!video) return;

            // readyState === 0 (HAVE_NOTHING) means iOS fully tore down the
            // decoder while backgrounded — there's genuinely nothing to seek
            // within yet, so a reload is unavoidable. Anything above that
            // (even stale/paused data) can be seeked directly; the browser
            // fetches whatever byte range the new position needs on its own.
            // Calling load() in that common case was the actual cause of the
            // slow resume: it wipes the element, and setting currentTime
            // immediately afterward (before 'loadedmetadata' fires) gets
            // silently dropped, so the seek didn't stick until a *later*
            // sync tick retried it — several extra seconds of buffering
            // from position 0 before the real resume even started.
            if (video.readyState === 0) {
                const onLoadedMetadata = () => {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    syncClock({ force: true });
                };
                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.load();
            } else {
                syncClock({ force: true });
            }
        };
        document.addEventListener('visibilitychange', handleForegroundReturn);
        window.addEventListener('pageshow', handleForegroundReturn);
        window.addEventListener('focus', handleForegroundReturn);

        return () => {
            clearInterval(interval);
            clearTimeout(initialDelay);
            document.removeEventListener('visibilitychange', handleForegroundReturn);
            window.removeEventListener('pageshow', handleForegroundReturn);
            window.removeEventListener('focus', handleForegroundReturn);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isControllerMode]); // ← intentionally omit partyState/movie — we use refs

    // ── HLS.JS ATTACHMENT — Android Chrome doesn't support HLS natively ──────
    useEffect(() => {
        const video = videoRef.current;
        const src = movie?.fullMovie;
        if (!video || !src || !src.includes('.m3u8')) return;

        // iOS Safari supports HLS natively — skip hls.js
        if (video.canPlayType('application/vnd.apple.mpegurl')) return;

        const attachHls = () => {
            const Hls = (window as any).Hls;
            if (!Hls || !Hls.isSupported()) return;
            if (hlsRef.current) hlsRef.current.destroy();
            const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
            hls.loadSource(src);
            hls.attachMedia(video);
            hlsRef.current = hls;
        };

        if ((window as any).Hls) {
            attachHls();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
            script.onload = attachHls;
            document.head.appendChild(script);
        }

        return () => {
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        };
    }, [movie?.fullMovie]);

    // ── HARD STOP WHEN ADMIN ENDS THE PARTY ───────────────────────────────
    // Ending the party swaps the JSX to the "Session Ended" screen, which
    // un-renders the <video> tag — but WatchPartyPage itself never unmounts
    // (it's one component conditionally returning different views), so the
    // hls.js instance attached above never runs its cleanup. On Android
    // Chrome (the only place hls.js is used — iOS/Safari play HLS natively)
    // hls.js keeps feeding the MediaSource and the detached video element
    // keeps playing/decoding even though it's no longer visible. Explicitly
    // pause + detach the source and destroy hls.js the moment the party ends.
    useEffect(() => {
        if (partyState?.status !== 'ended') return;
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    }, [partyState?.status]);

    useEffect(() => {
        // Retry until Firebase is ready — it initializes async so first call may return null
        let unsubscribe: (() => void) | null = null;
        let reactionsUnsub: (() => void) | null = null;
        let viewerUnsub: (() => void) | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let partyRefForVisibility: any = null;

        const applyPartyDoc = (doc: any) => {
            if (!doc.exists) return;
            const state = doc.data() as WatchPartyState;
            setPartyState(state);
            partyStateRef.current = state; // keep stable ref in sync
            if (state.status === 'live') setShowLobby(false);
        };

        const setup = () => {
            const db = getDbInstance();
            if (!db) {
                // Firebase not ready yet — retry in 500ms
                retryTimer = setTimeout(setup, 500);
                return;
            }
            const partyRef = db.collection('watch_parties').doc(movieKey);
            partyRefForVisibility = partyRef;
            unsubscribe = partyRef.onSnapshot(doc => {
                applyPartyDoc(doc);
                setPartyStateReady(true);
            });
            reactionsUnsub = partyRef.collection('live_reactions')
                .where('timestamp', '>=', new Date(Date.now() - 5000))
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: change.doc.data().emoji }]);
                    });
                });
            viewerUnsub = partyRef.collection('lobby_viewers').onSnapshot(snapshot => {
                setViewerCount(snapshot.size);
            });
        };

        setup();

        // ── FORCE A FRESH FETCH ON FOREGROUND RETURN ─────────────────────────
        // Backgrounding a tab on mobile can suspend the Firestore socket (no
        // reconnect until the SDK notices), so activeMovieIndex can go stale
        // while the party advances to a later film. Rather than wait for
        // onSnapshot to reconnect on its own, explicitly re-fetch the party
        // doc the moment the tab is visible again so the block index (and
        // therefore which film's <video src> we render) catches up right away
        // instead of briefly showing/playing a film that's already over.
        const handleVisible = () => {
            if (document.visibilityState !== 'visible' || !partyRefForVisibility) return;
            partyRefForVisibility.get().then(applyPartyDoc).catch(() => {});
        };
        document.addEventListener('visibilitychange', handleVisible);

        return () => {
            if (retryTimer) clearTimeout(retryTimer);
            if (unsubscribe) unsubscribe();
            if (reactionsUnsub) reactionsUnsub();
            if (viewerUnsub) viewerUnsub();
            document.removeEventListener('visibilitychange', handleVisible);
        };
    }, [movieKey]);

    // ── SESSION GUARD — prevents password sharing ───────────────────────────
    // Active whenever the user has paid access (live OR on-demand VOD)

    // ── BLOCK AUTO-ADVANCE: when a film ends in a block, advance to next film ───
    useEffect(() => {
        if (!isEnded) return;
        const m = movie as any;
        const blockKeys: string[] | undefined = m?._blockMovieKeys;
        if (!blockKeys || blockKeys.length === 0) {
            // Single movie — show credits as before
            if (!showCredits) setShowCredits(true);
            return;
        }

        const currentIdx = partyState?.activeMovieIndex ?? 0;
        const isLastFilm = currentIdx >= blockKeys.length - 1;

        if (isLastFilm) {
            // All films done — show credits
            if (!showCredits) setShowCredits(true);
            return;
        }

        // There's a next film — write intermission + advance to Firestore
        // Only the FIRST viewer to detect end triggers the advance (guard with a ref)
        const db = getDbInstance();
        if (!db) return;

        const partyRef = db.collection('watch_parties').doc(movieKey);
        const intermissionEnd = Date.now() + 60000; // 60 second intermission
        const targetIdx = currentIdx + 1;

        // TRANSACTION GUARD: multiple viewers detect "ended" within the same
        // ~1s sync window. Without a transaction, each would re-write
        // activeMovieIndex + a NEW serverTimestamp, repeatedly resetting
        // filmStartTime and causing the next film to keep restarting from 0.
        // The transaction ensures only the FIRST detection actually advances —
        // every subsequent attempt sees activeMovieIndex already changed and no-ops.
        db.runTransaction(async (tx) => {
            const snap = await tx.get(partyRef);
            const current = snap.data();
            if ((current?.activeMovieIndex ?? 0) !== currentIdx) return; // already advanced by another client
            tx.update(partyRef, {
                activeMovieIndex: targetIdx,
                intermissionUntil: intermissionEnd,
                filmStartTime: firebase.firestore.FieldValue.serverTimestamp(),
                isPlaying: true,
                currentTime: 0,
            });
        }).catch(() => {});

        // Reset local ended state
        setIsEnded(false);
    }, [isEnded]);

    // ── INTERMISSION COUNTDOWN: tick down locally from partyState ───────
    useEffect(() => {
        if (!partyState?.intermissionUntil) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((partyState.intermissionUntil! - Date.now()) / 1000));
            setIntermissionSeconds(remaining);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [partyState?.intermissionUntil]);

    // Show credits when video ends (single movie only)
    useEffect(() => {
        if (isEnded && !showCredits) {
            const m = movie as any;
            if (!m?._blockMovieKeys) setShowCredits(true);
        }
    }, [isEnded, showCredits, movie]);

    // Determine if we should show lobby
    const shouldShowLobby = useMemo(() => {
        // Never show if party is live or ended
        if (partyState?.status === 'live') return false;
        if (partyState?.status === 'ended') return false;
        // Never show if user dismissed it
        if (!showLobby) return false;
        // Show lobby any time watch party is enabled and party hasn't started
        if (movie?.isWatchPartyEnabled) return true;
        return false;
    }, [partyState, showLobby, movie]);

    const hasAccess = useMemo(() => {
        if (isControllerMode || isBackstageVerified) return true;
        if (!movie) return false;
        if (unlockedWatchPartyKeys.has(movieKey)) return true;
        if (hasFestivalAllAccess) return true;
        if (unlockedFestivalBlockIds.has(movieKey)) return true;

        // If this movie belongs to a festival block, gate on the BLOCK's price not the movie's
        const parentBlock = festivalData.flatMap(d => d.blocks).find(b => b.movieKeys.includes(movieKey));
        if (parentBlock) {
            if (unlockedFestivalBlockIds.has(parentBlock.id)) return true;
            // SECURITY: if block price is not set, default to PAID (not free)
            // Admin must explicitly set price to 0 to make a block free
            // This prevents accidental free access from missing price config
            if (parentBlock.price === 0) return true;
            const exp = rentals[movieKey];
            if (exp && new Date(exp) > new Date()) return true;
            return false;
        }

        if (!movie.isWatchPartyPaid) return true;
        const exp = rentals[movieKey];
        return !!(exp && new Date(exp) > new Date());
    }, [movie, rentals, movieKey, unlockedWatchPartyKeys, isControllerMode, isBackstageVerified, hasFestivalAllAccess, unlockedFestivalBlockIds, festivalData]);

    // ── SESSION GUARD — prevents password sharing ───────────────────────────
    const isPaidContent = !!(movie?.isWatchPartyPaid && hasAccess);
    const { kicked: sessionKicked, reason: kickReason } = useSessionGuard(user?.uid, isPaidContent);

    // ── SESSION GUARD — prevents password sharing ───────────────────────────
    // Active whenever the user has paid access (live OR on-demand VOD)

    const logSentiment = async (emoji: string) => {
        const db = getDbInstance();
        if (db) db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({ emoji, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    };

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    if (isControllerMode) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col z-[500]">
                <div className="p-4 bg-red-600 flex justify-between items-center">
                    <h1 className="font-black uppercase tracking-widest text-xs">Crate Remote</h1>
                    <button onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }} className="text-[10px] font-bold">EXIT</button>
                </div>
                <div className="flex-grow flex flex-col overflow-hidden">
                    <EmbeddedChat partyKey={movieKey} directors={[]} isQALive={partyState?.isQALive} user={user} isMobileController={true} />
                </div>
                <div className="p-4 bg-white/5 grid grid-cols-5 gap-2 border-t border-white/10">
                    {REACTION_TYPES.map(emoji => (
                        <button key={emoji} onClick={() => logSentiment(emoji)} className="text-3xl py-4 hover:scale-125 transition-transform">{emoji}</button>
                    ))}
                </div>
            </div>
        );
    }

    // ── SESSION KICKED SCREEN ─────────────────────────────────────────────────
    if (sessionKicked) return <SessionKickedScreen reason={kickReason} />;

    // ── WAITING SCREEN — user skipped lobby but party hasn't started yet ─────
    // Shows a cinematic holding screen with the film preloading in background
    const partyNotStarted = !partyState?.status || partyState?.status === 'waiting';
    if (!showLobby && partyNotStarted && movie?.isWatchPartyEnabled) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                {/* Blurred poster backdrop */}
                {movie.poster && (
                    <div className="absolute inset-0">
                        <img src={movie.poster} alt="" className="w-full h-full object-cover opacity-[0.06] blur-3xl scale-110" />
                        <div className="absolute inset-0 bg-black/80" />
                    </div>
                )}
                {/* Hidden preload — buffers film while waiting */}
                {movie.fullMovie && (
                    <video src={movie.fullMovie} preload="auto" muted playsInline
                        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
                        aria-hidden="true"
                    />
                )}
                <div className="relative z-10 text-center space-y-6 px-8">
                    <div className="relative w-12 h-12 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">{movie.title}</h2>
                        {movie.director && <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Directed by {movie.director}</p>}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">Waiting for host to start the party</p>
                    <button
                        onClick={() => setShowLobby(true)}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-700 hover:text-white transition-colors border border-white/5 hover:border-white/20 px-4 py-2 rounded-lg"
                    >
                        Back to lobby
                    </button>
                </div>
            </div>
        );
    }

    // Show pre-show lobby if party hasn't started yet — ALL users see the lobby
    // Unpaid users see a buy ticket prompt inside the lobby
    if (shouldShowLobby) {
        return (
            <>
                <WatchPartyLobby 
                    movie={movie}
                    movieKey={movieKey}
                    blockPrice={parentBlock?.price}
                    partyState={partyState}
                    onPartyStart={() => setShowLobby(false)}
                    user={user}
                    hasAccess={hasAccess}
                    onBuyTicket={() => setShowPaywall(true)}
                />
                {/* Hidden preload video — silently buffers the film while lobby is showing
                    so there's no blank screen when the party starts */}
                {hasAccess && movie.fullMovie && (
                    <video
                        src={movie.fullMovie}
                        preload="auto"
                        muted
                        playsInline
                        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
                        aria-hidden="true"
                    />
                )}
                {showPaywall && (
                    <SquarePaymentModal 
                        movie={movie} 
                        paymentType={parentBlock ? "block" : "watchPartyTicket"}
                        block={parentBlock || undefined}
                        onClose={() => setShowPaywall(false)}
                        onPaymentSuccess={handlePaymentSuccess} 
                    />
                )}
            </>
        );
    }

    // Show terminated screen when admin ends the party
    if (partyState?.status === 'ended') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <div className="text-center space-y-8 p-8 max-w-lg animate-[fadeIn_0.5s_ease-out]">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] mb-2">Transmission Terminated</p>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Session Ended</h1>
                    </div>
                    <p className="text-gray-500">This watch party has been ended by the host. Thank you for joining!</p>
                    <button 
                        onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }}
                        className="bg-white text-black font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    // Show credits/applause screen when film ends
    // ── INTERMISSION SCREEN ─────────────────────────────────────────────
    if (isInIntermission && partyState?.status === 'live') {
        const m = movie as any;
        const blockKeys: string[] = m?._blockMovieKeys || [];
        const currentIdx = partyState?.activeMovieIndex ?? 0;
        const nextIdx = Math.min(currentIdx, blockKeys.length - 1);
        const nextFilm = allMovies[blockKeys[nextIdx]] || movie!;
        const prevFilm = allMovies[blockKeys[Math.max(0, nextIdx - 1)]] || movie!;

        return (
            <IntermissionScreen
                currentFilm={prevFilm}
                nextFilm={nextFilm}
                currentIndex={nextIdx}
                totalFilms={blockKeys.length}
                secondsRemaining={intermissionSeconds}
            />
        );
    }

    // ── INTRO VIDEO — plays before the main film on opening night ────────
    const hasIntro = !!(movie?.watchPartyIntroVideoUrl);
    const shouldShowIntro = hasIntro && !introDone && !showLobby && partyState?.status === 'live';

    if (shouldShowIntro) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <video
                    src={movie.watchPartyIntroVideoUrl}
                    autoPlay
                    playsInline
                    controls={false}
                    className="w-full h-full object-contain"
                    onEnded={() => setIntroDone(true)}
                    onError={() => setIntroDone(true)}
                />
            </div>
        );
    }

    if (showCredits) {
        return (
            <WatchPartyCredits
                movie={movie}
                partyState={partyState}
                viewerCount={viewerCount}
                onClose={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }}
                onRewatch={() => {
                    setShowCredits(false);
                    setIsEnded(false);
                    if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                    }
                }}
                user={user}
                isLiked={isLiked}
                onToggleLike={handleToggleLike}
                hasFestivalAllAccess={hasFestivalAllAccess}
                onUpgradeToFullPass={() => setShowPaywall(true)}
                nextBlock={nextBlockInfo}
                onBuyNextBlock={handleBuyNextBlock}
            />
        );
    }

    // ── AVOID FLASHING THE WRONG FILM ─────────────────────────────────────
    // For a block, `movie` falls back to film index 0 until partyState has
    // loaded. If we mount the <video> during that window it briefly loads
    // (and can start playing) the FIRST film in the block instead of the one
    // actually airing — this is what showed up on iPhone as "it goes back to
    // the first frame of the first movie" after returning from the background,
    // since a remount briefly recreates exactly that window before the fresh
    // Firestore snapshot arrives.
    const isBlockContext = !!(((movie as any)?._blockMovieKeys?.length) > 1);
    if (isBlockContext && !partyStateReady) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden">
                <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full">
                <div className="flex-grow flex flex-col relative h-full">
                    <div className="p-3 bg-black/90 flex items-center justify-between border-b border-white/5">
                        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="text-center flex flex-col items-center">
                            <span className="text-red-500 font-black text-[9px] uppercase tracking-widest animate-pulse">Transmission Active</span>
                            {(() => {
                                const m = movie as any;
                                // NOTE: the old "Film X/Y" progress dots were removed — they read
                                // partyState.activeMovieIndex on first render only in some cached
                                // paths and visibly lagged behind the actual film advancing, so we
                                // just show the currently-playing title instead of a counter that
                                // can drift out of sync.
                                return <h2 className="text-sm font-bold truncate max-w-[200px] md:max-w-none">{m?._activeFilmTitle || movie.title}</h2>;
                            })()}
                            {isBackstageVerified && (
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Backstage Verified</span>
                            )}
                        </div>
                        <div className="w-10 flex justify-end">
                            {!isBackstageVerified && (
                                <button 
                                    onClick={() => {
                                        const key = window.prompt("Enter Backstage Key:");
                                        if (key && partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                            setIsBackstageVerified(true);
                                            unlockWatchParty(movieKey);
                                        } else if (key) {
                                            toast.error("Invalid access key.");
                                        }
                                    }}
                                    className="text-gray-600 hover:text-white transition-colors"
                                    title="Backstage Access"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow bg-[#050505] relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-[150] pointer-events-none">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {!hasAccess ? (
                             <div className="text-center px-6 py-12 space-y-10 animate-[fadeIn_0.8s_ease-out] max-w-lg mx-auto w-full">
                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">Admission Required.</h2>
                                <div className="space-y-6">
                                    <button onClick={() => setShowPaywall(true)} className="w-full bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all border border-red-500/50">
                                        Unlock Admission // ${movie.watchPartyPrice?.toFixed(2)}
                                    </button>
                                    
                                    <div className="pt-10 border-t border-white/10">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">Director & Staff Verification</p>
                                        <form onSubmit={handleBackstageSubmit} className="flex flex-col gap-4">
                                            <input 
                                                type="text" 
                                                placeholder="Enter Backstage Key" 
                                                value={backstageInput}
                                                onChange={(e) => setBackstageInput(e.target.value)}
                                                className={`bg-white/10 border-2 ${backstageError ? 'border-red-500' : 'border-white/30'} rounded-2xl px-6 py-4 text-center font-mono text-lg tracking-[0.4em] uppercase outline-none focus:border-white/60 transition-all text-white placeholder:text-white/30 w-full`}
                                            />
                                            <button type="submit" className="text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-colors bg-white/5 hover:bg-white/10 rounded-xl py-3 px-6 border border-white/10 hover:border-white/20 w-full">
                                                {backstageError ? '⚠ Invalid Protocol Key' : 'Authorize Backstage Access'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                             </div>
                        ) : (
                            movie.isLiveStream ? (
                                <div className="w-full h-full p-2 md:p-6 lg:p-12 flex items-center justify-center bg-black">
                                    <div className="w-full h-full bg-gray-900 rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl border border-white/5 relative" dangerouslySetInnerHTML={{ __html: processLiveEmbed(movie.liveStreamEmbed!) }} />
                                </div>
                            ) : (
                                <div className="relative w-full h-full">
                                    {/* Buffering spinner — shows until video has enough data to play */}
                                    {/* Blurred backdrop for non-16:9 films */}
                                    <video
                                        src={movie.fullMovie}
                                        className={`absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40 pointer-events-none transition-opacity duration-1000 ${isEnded ? 'opacity-0' : 'opacity-40'}`}
                                        muted playsInline aria-hidden="true"
                                    />
                                    <video
                                        ref={videoRef}
                                        src={movie.fullMovie}
                                        className={`relative w-full h-full object-contain transition-opacity duration-1000 ${isEnded ? 'opacity-30 blur-xl' : 'opacity-100'}`}
                                        muted={needsUserGesture}
                                        playsInline
                                        webkit-playsinline="true"
                                        preload="auto"
                                        controls={false}
                                        onCanPlay={handleVideoCanPlay}
                                        onPlaying={() => {
                                            hasUserInteractedRef.current = true;
                                            handleVideoCanPlay();
                                        }}
                                        onWaiting={handleVideoWaiting}
                                        onStalled={handleVideoWaiting}
                                    />
                                    {/* Small unmute button — video autoplays muted, tap to unmute */}
                                    {needsUserGesture && partyState?.status === 'live' && !isEnded && (
                                        <button
                                            className="absolute bottom-4 right-4 z-[170] flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 text-white hover:bg-black/90 transition-all active:scale-95"
                                            onClick={() => {
                                                const video = videoRef.current;
                                                if (video) {
                                                    video.muted = false;
                                                    video.play().catch(() => {});
                                                }
                                                hasUserInteractedRef.current = true;
                                                setNeedsUserGesture(false);
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            </svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Tap to Unmute</span>
                                        </button>
                                    )}
                                    {isEnded && (
                                        <div className="absolute inset-0 z-[160] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl animate-[fadeIn_1.2s_ease-out] text-center p-8">
                                            <div className="max-w-2xl space-y-10">
                                                <div>
                                                    <p className="text-red-500 font-black uppercase tracking-[0.8em] text-[10px] mb-4">Transmission Complete</p>
                                                    <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none text-white">Thank You.</h3>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-6 max-w-lg mx-auto leading-relaxed">
                                                        "{movie.title}" produced by <span className="text-white">{movie.director}</span>. Thank you for supporting the distribution afterlife of independent cinema.
                                                    </p>
                                                </div>
                                                <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-10">
                                                    <button onClick={() => window.history.back()} className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-colors">Return to Library</button>
                                                    <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                                                    <button onClick={() => { window.history.pushState({}, '', '/public-square'); window.dispatchEvent(new Event('pushstate')); }} className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 hover:text-white transition-colors">The Public Square</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <div 
                        className="p-4 bg-black/40 border-y border-white/5 flex justify-center gap-6 md:gap-12 backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {REACTION_TYPES.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={(e) => { e.stopPropagation(); logSentiment(emoji); }} 
                                className="text-4xl md:text-5xl hover:scale-150 active:scale-90 transition-transform drop-shadow-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="md:hidden h-80 flex flex-col overflow-hidden bg-[#0a0a0a]">
                        <EmbeddedChat 
                            partyKey={movieKey} 
                            directors={[]} 
                            isQALive={partyState?.isQALive} 
                            user={user} 
                            isBackstageVerified={isBackstageVerified} 
                            onBackstageVerify={(key) => {
                                if (partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                    setIsBackstageVerified(true);
                                    unlockWatchParty(movieKey);
                                } else {
                                    toast.error("Invalid access key.");
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="hidden md:flex w-96 flex-shrink-0 h-full border-l border-white/5">
                    <EmbeddedChat 
                        partyKey={movieKey} 
                        directors={[]} 
                        isQALive={partyState?.isQALive} 
                        user={user} 
                        isBackstageVerified={isBackstageVerified} 
                        onBackstageVerify={(key) => {
                            if (partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                setIsBackstageVerified(true);
                                unlockWatchParty(movieKey);
                            } else {
                                toast.error("Invalid access key.");
                            }
                        }}
                    />
                </div>
            </div>

            {showPaywall && (
                <SquarePaymentModal 
                    movie={movie} 
                    paymentType={parentBlock ? "block" : "watchPartyTicket"}
                    block={parentBlock || undefined}
                    onClose={() => setShowPaywall(false)}
                    onPaymentSuccess={handlePaymentSuccess} 
                />
            )}
        </div>
    );
};
