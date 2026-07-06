
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
import { hasUserGestured, onFirstUserGesture } from '../services/userGesture';

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

const EmbeddedChat = React.memo<{ partyKey: string; directors: string[]; isQALive?: boolean; user: any; isMobileController?: boolean; isBackstageVerified?: boolean; verifiedBackstageKey?: string; onBackstageVerify?: (key: string) => void }>(({ partyKey, directors, isQALive, user, isMobileController, isBackstageVerified, verifiedBackstageKey, onBackstageVerify }) => {
    const { getUserIdToken } = useAuth();
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
            // The server now verifies both of these independently — an ID
            // token to confirm this is a real signed-in account, and (when
            // claiming director status) the actual backstage key, not just
            // a client-side boolean. See api/send-chat-message.ts.
            const idToken = await getUserIdToken();
            await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieKey: partyKey,
                    userName: user.name || user.email,
                    userAvatar: user.avatar || 'fox',
                    text: newMessage,
                    isVerifiedDirector: isBackstageVerified,
                    backstageKey: isBackstageVerified ? verifiedBackstageKey : undefined,
                    idToken,
                }),
            });
            setNewMessage('');
        } catch (error) { console.error("Chat error:", error); } finally { setIsSending(false); }
    };

    return (
        <div 
            className={`w-full h-full flex flex-col ${isMobileController ? 'bg-black' : 'bg-[#0a0a0a] md:bg-gray-900'} overflow-hidden min-h-0`}
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
                    <input type="text" name="chat-message" autoComplete="off" autoCorrect="on" spellCheck="true" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={isBackstageVerified ? "Answer a question..." : (isQALive ? "Ask the director a question..." : "Type a message...")} className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    {/* p-2.5 around the icon brings the actual tap target to ~44px —
                        it used to be just the bare 24px SVG, easy to miss especially
                        with one thumb while the keyboard is open. disabled:opacity-30
                        also now makes it visually obvious when there's nothing to send,
                        instead of looking identical to the active state. */}
                    <button type="submit" className={`flex-shrink-0 p-2.5 -m-1 rounded-full transition-opacity disabled:opacity-30 ${isBackstageVerified ? 'text-red-400' : 'text-red-500'}`} disabled={!user || isSending || !newMessage.trim()}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
});

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty, unlockFestivalBlock, grantFestivalAllAccess, rentals, likedMovies: likedMoviesArray, toggleLikeMovie, hasFestivalAllAccess, unlockedFestivalBlockIds, getUserIdToken } = useAuth();
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

    // This used to just navigate straight to the next block's watch party
    // URL — no payment modal, nothing actually charged, despite the button
    // on the credits screen showing a real price ("Get Tickets — $10.00").
    // Clicking it looked like a purchase but wasn't wired to one at all;
    // whoever clicked it landed on the next block's page still without
    // access. Now it opens an actual payment modal for that block, and only
    // navigates + unlocks it once the charge really goes through.
    const [showNextBlockPaywall, setShowNextBlockPaywall] = useState(false);
    const handleBuyNextBlock = useCallback(() => {
        if (!nextBlockInfo) return;
        setShowNextBlockPaywall(true);
    }, [nextBlockInfo]);

    const handleNextBlockPaymentSuccess = useCallback(async () => {
        if (!nextBlockInfo) return;
        await unlockFestivalBlock(nextBlockInfo.id);
        setShowNextBlockPaywall(false);
        window.history.pushState({}, '', `/watchparty/${nextBlockInfo.id}`);
        window.dispatchEvent(new Event('pushstate'));
    }, [nextBlockInfo, unlockFestivalBlock]);

    // "Upgrade to All-Access — $50" on the credits screen used to reuse
    // `showPaywall`, which is hardcoded to charge for the CURRENT block/film
    // again (paymentType 'block'/'watchPartyTicket', priced at that item's
    // regular price) — someone tapping the $50 upgrade button would see a
    // payment modal for something they'd already unlocked, at the wrong
    // price, instead of the actual all-access pass. This gives it its own
    // dedicated modal, matching the pattern used for the homepage purchase.
    const [showFullPassPaywall, setShowFullPassPaywall] = useState(false);

    // Correct unlock: blocks use unlockFestivalBlock, individual films use unlockWatchParty
    const handlePaymentSuccess = useCallback(() => {
        if (parentBlock) unlockFestivalBlock(parentBlock.id);
        else unlockWatchParty(movieKey);
        setShowPaywall(false);
    }, [parentBlock, movieKey, unlockFestivalBlock, unlockWatchParty]);
    const [backstageInput, setBackstageInput] = useState('');
    const [backstageError, setBackstageError] = useState(false);
    const [isBackstageVerified, setIsBackstageVerified] = useState(false);
    // The actual key value, kept alongside the boolean so chat messages can
    // send it to the server for independent re-verification — see
    // api/send-chat-message.ts, which no longer trusts isVerifiedDirector
    // as a bare claim.
    const [verifiedBackstageKey, setVerifiedBackstageKey] = useState('');
    const [isEnded, setIsEnded] = useState(false);
    const [isControllerMode, setIsControllerMode] = useState(false);
    const [showLobby, setShowLobby] = useState(true);
    const [showCredits, setShowCredits] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(false); // start false — show player immediately
    const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Separate from isVideoBuffering (which also toggles during brief mid-
    // playback rebuffers, and shouldn't fade the whole video out each time) —
    // this is purely "has this video ever shown a real frame yet," used to
    // fade the very first frame in instead of it popping into view the
    // instant the element mounts, which read as an abrupt jump-cut right
    // after the lobby's transition spinner disappears.
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    // Real playback failures (bad source, unsupported codec, hls.js giving up
    // after exhausting its own retry logic, the hls.js CDN script itself
    // failing to load) used to have no visible handling at all — the video
    // just sat there black/frozen forever with nothing telling the viewer
    // (or us) anything had gone wrong. This drives a dedicated error overlay
    // with a manual retry, distinct from isEnded (which is for a normal
    // finished screening, not a failure).
    const [videoError, setVideoError] = useState<string | null>(null);

    const handleVideoWaiting = useCallback(() => {
        // Only show buffering overlay after 1.5s of sustained stall — avoids flashing on seeks
        bufferingTimerRef.current = setTimeout(() => setIsVideoBuffering(true), 1500);
    }, []);
    const handleVideoCanPlay = useCallback(() => {
        if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
        setIsVideoBuffering(false);
        setHasStartedPlaying(true);
    }, []);

    // Clear any pending buffering timer if the component unmounts mid-stall
    // (e.g. viewer navigates back to the catalog before onCanPlay ever
    // fires) — previously this timer was only ever cleared from inside
    // onCanPlay/onPlaying, so an interrupted load left it running in the
    // background pointing at a dead callback.
    useEffect(() => {
        return () => {
            if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
        };
    }, []);
    // Was always true, meaning EVERY viewer landed on a muted video and had
    // to notice + tap a small corner button to hear anything — even though
    // by the time someone reaches the actual video, they've almost always
    // already tapped through several screens to get here (entering the
    // lobby, etc.), which already satisfies the browser's "needs a user
    // gesture" requirement for unmuted playback. Starting this based on
    // whether that's already happened skips the unnecessary extra step for
    // the vast majority of viewers. See services/userGesture.ts.
    const [needsUserGesture, setNeedsUserGesture] = useState(() => !hasUserGestured());
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
    // Seeded from the same global flag needsUserGesture uses — this used to
    // always start `false` regardless of whether the user had already
    // gestured, which meant the sync engine's play/pause check below (which
    // reads this ref, not React state) could wrongly conclude "no gesture
    // yet" and force the video back to muted on a later film in the block,
    // even though the viewer had already unmuted once and shouldn't ever
    // need to again. See the effect right below for the other half of this
    // fix — it used to bail out before ever setting this ref if the gesture
    // had already happened before this component mounted.
    const hasUserInteractedRef = useRef<boolean>(hasUserGestured()); // mobile autoplay gate

    // ── AUTO-UNMUTE ON FIRST INTERACTION ─────────────────────────────────
    // Backs up the lazy needsUserGesture initializer above for the case
    // where the video mounts before any interaction has happened yet (e.g.
    // someone lands mid-countdown and the party goes live without them
    // tapping anything first). The moment ANY interaction happens anywhere
    // on the page after that — not necessarily the "Tap to Unmute" button
    // itself — unmute automatically, so that button is a rarely-needed
    // fallback rather than the only path to sound.
    useEffect(() => {
        if (!needsUserGesture) {
            // Gesture already happened before this ran (e.g. it happened on
            // an earlier screen, well before this component even mounted) —
            // still need to make sure the ref agrees, since it's what the
            // sync engine actually trusts, not this state variable directly.
            hasUserInteractedRef.current = true;
            return;
        }
        return onFirstUserGesture(() => {
            hasUserInteractedRef.current = true;
            setNeedsUserGesture(false);
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            const tryPlay = () => {
                video.play().catch((err: any) => {
                    // Same defensive fallback as the film-advance effect below —
                    // if the browser actually rejects unmuted playback here,
                    // don't leave the viewer stuck silently; fall back to
                    // muted (guaranteed to play) and bring the button back.
                    if (err?.name === 'NotAllowedError') {
                        video.muted = true;
                        video.play().catch(() => {});
                        setNeedsUserGesture(true);
                    }
                });
            };
            tryPlay();
            [400, 1000, 2000].forEach(delay => {
                setTimeout(() => { if (video.paused) tryPlay(); }, delay);
            });
        });
    }, [needsUserGesture]);

    // ── BLOCK / SEQUENTIAL PLAYBACK STATE ───────────────────────────────
    const [intermissionSeconds, setIntermissionSeconds] = useState<number>(0);
    const isInIntermission = !!(partyState?.intermissionUntil && Date.now() < partyState.intermissionUntil);

    const isLiked = likedMoviesArray?.includes(movieKey) || false;
    const handleToggleLike = () => toggleLikeMovie(movieKey);

    const movie = useMemo(() => {
        if (allMovies[movieKey]) return allMovies[movieKey];
        
        // Check if it's a festival block
        // (|| [] guard — a festival day doc without a blocks array made this
        // throw a TypeError, which crashed the whole page render via the
        // error boundary right at the moment a party went live: that's the
        // instant activeMovieIndex first appears on the party doc, which is
        // in this hook's own dependency array, forcing a recompute exactly
        // then. From the viewer's side that looked like "the video just
        // never showed up" — the only way back was a full page reload,
        // which loads unaffected by whatever had crashed the live render.)
        const block = festivalData.flatMap(d => d.blocks || []).find(b => b.id === movieKey);
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
            setVerifiedBackstageKey(backstageInput);
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

    // ── MOBILE KEYBOARD STABILITY ─────────────────────────────────────────
    // On mobile, focusing the chat input used to make the browser resize/scroll
    // the whole page to reveal the keyboard, which shoved the video player
    // around. We track how much the on-screen keyboard is covering via the
    // visualViewport API and use that offset to slide just the chat drawer up
    // above the keyboard — the video player itself is now a fixed-position
    // element that this offset never touches, so it stays put.
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    useEffect(() => {
        const vv = (window as any).visualViewport;
        if (!vv) return;
        const handleViewportChange = () => {
            const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            setKeyboardOffset(offset);
        };
        vv.addEventListener('resize', handleViewportChange);
        vv.addEventListener('scroll', handleViewportChange);
        handleViewportChange();
        return () => {
            vv.removeEventListener('resize', handleViewportChange);
            vv.removeEventListener('scroll', handleViewportChange);
        };
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
                } else if (absDrift > 1.5 && absDrift <= 8 && video.readyState >= 3) {
                    // Gentler catch-up rate (±3% instead of ±6%) — noticeably smoother,
                    // and the wider 1.5s dead zone (was 0.5s) stops the constant tiny
                    // rate flips that made playback feel like it was "sticking".
                    video.playbackRate = drift > 0 ? 1.03 : 0.97;
                } else if (video.playbackRate !== 1.0) {
                    video.playbackRate = 1.0;
                }

                // Play/pause — always try to play muted first (works without user gesture).
                // If user has interacted, unmute is handled by the unmute button.
                if (ps.isPlaying && video.paused && !video.ended && (video.readyState >= 2 || opts?.force)) {
                    if (!hasUserInteractedRef.current) {
                        video.muted = true; // ensure muted for autoplay
                    }
                    video.play().catch((err: any) => {
                        // This runs on every ~1.5s sync tick, so if an unmuted
                        // attempt keeps getting rejected here it would silently
                        // retry forever with no sound and (since the button was
                        // already hidden on the assumption unmute had worked)
                        // no way for the viewer to fix it. Same fallback as the
                        // other autoplay attempts in this file.
                        if (err?.name === 'NotAllowedError' && !video.muted) {
                            video.muted = true;
                            video.play().catch(() => {});
                            setNeedsUserGesture(true);
                        }
                    });
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

        setVideoError(null);

        const attachHls = () => {
            const Hls = (window as any).Hls;
            if (!Hls || !Hls.isSupported()) {
                setVideoError('This device can’t play this stream. Please try a different browser.');
                return;
            }
            if (hlsRef.current) hlsRef.current.destroy();
            // maxBufferLength trimmed from 30s to 20s — on a real cellular
            // connection (not festival-venue wifi), prefetching 30s ahead
            // burns data fast and stalls harder when it does run dry; 20s is
            // still enough runway to absorb normal network jitter.
            const hls = new Hls({ maxBufferLength: 20, enableWorker: true });

            // Previously nothing listened for hls.js errors at all — a fatal
            // network or media error (a dropped segment, a manifest hiccup,
            // anything) meant hls.js gave up internally with zero visible
            // sign to the viewer beyond a frozen/black video. This follows
            // hls.js's own documented recovery pattern: retry loading on a
            // network error, try to recover the media pipeline on a media
            // error, and only surface a real "something's wrong" state (with
            // a manual retry) if neither of those works.
            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
                if (!data?.fatal) return;
                console.error('[HLS] fatal error', data.type, data.details);
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        hls.destroy();
                        hlsRef.current = null;
                        setVideoError('Playback stopped unexpectedly.');
                        break;
                }
            });

            hls.loadSource(src);
            hls.attachMedia(video);
            hlsRef.current = hls;
        };

        if ((window as any).Hls) {
            attachHls();
        } else {
            const script = document.createElement('script');
            // Pinned to the same version WatchPartyLobby.tsx preloads —
            // that file was fetching hls.js@latest while this one used a
            // pinned version, so depending on which mounted first, playback
            // could silently pick up an untested hls.js release with no way
            // to roll back except waiting for upstream to fix it.
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
            script.onload = attachHls;
            script.onerror = () => {
                console.error('[HLS] failed to load hls.js from CDN');
                setVideoError('Couldn’t load the video player. Check your connection and retry.');
            };
            document.head.appendChild(script);
        }

        return () => {
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        };
    }, [movie?.fullMovie]);

    // ── CARRY "UNMUTED" THROUGH TO THE NEXT FILM ──────────────────────────
    // Once a viewer has unmuted, they should never be asked to do it again
    // for the rest of the session — but loading a new film's source into
    // the same <video> element pauses it and can leave it sitting there
    // muted-by-default rather than resuming with sound, since a fresh media
    // load doesn't automatically inherit "the viewer already proved they
    // want sound" the way React's own state does. This explicitly re-applies
    // that whenever the active film changes, so advancing to the next film
    // in a block (or the sync engine catching up a late/returning viewer)
    // never quietly slips back into muted playback that only the small
    // "Tap to Unmute" button could fix.
    useEffect(() => {
        if (needsUserGesture) return; // no gesture yet — first film still needs the button
        const video = videoRef.current;
        if (!video || !movie?.fullMovie) return;
        video.muted = false;

        // A gesture happening ANYWHERE earlier on the page (tapping "Join
        // Party," entering the lobby, etc.) is enough for Chrome to allow
        // unmuted autoplay indefinitely afterward — but iOS Safari ties that
        // permission more strictly to the specific play() call, and can
        // reject an unmuted attempt here even though a real gesture already
        // happened minutes ago. When that's what's happening, the browser
        // rejects with NotAllowedError specifically — silently retrying the
        // same unmuted call forever (the old behavior) just leaves the
        // viewer stuck on a frozen frame with no sound and no button to fix
        // it, since the button was hidden on the assumption this would work.
        let cancelled = false;
        const tryPlay = () => {
            video.play().catch((err: any) => {
                if (cancelled) return;
                if (err?.name === 'NotAllowedError') {
                    video.muted = true;
                    video.play().catch(() => {});
                    setNeedsUserGesture(true); // bring the manual button back as a fallback
                }
            });
        };
        tryPlay();
        const retries = [300, 800, 1500, 3000].map(delay =>
            setTimeout(() => { if (video.paused) tryPlay(); }, delay)
        );
        return () => { cancelled = true; retries.forEach(clearTimeout); };
    }, [movie?.fullMovie, needsUserGesture]);

    // ── STALLED-FOREVER DETECTION ──────────────────────────────────────────
    // A video that never fires a single error event can still just hang
    // indefinitely on some devices — most commonly an MP4 that wasn't
    // exported with "faststart" (metadata at the front of the file instead
    // of the end): desktop browsers tend to tolerate that and play it
    // anyway, but iOS Safari can sit there forever on readyState 0 with no
    // error, no progress, nothing — which looked exactly like "it just
    // shows a frosted frame and never starts," with zero indication to the
    // viewer (or to us) that anything was even wrong. This gives real
    // playback 20 seconds to actually begin; if it hasn't by then, it
    // surfaces the same error-and-retry overlay used for hard failures
    // instead of leaving the viewer staring at a silent blank screen.
    useEffect(() => {
        if (!movie?.fullMovie) return;
        const timer = setTimeout(() => {
            const video = videoRef.current;
            if (video && video.readyState === 0) {
                setVideoError('This is taking longer than it should. Tap to try again.');
            }
        }, 20000);
        return () => clearTimeout(timer);
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

    // ── SCREEN WAKE LOCK — keep the device screen from sleeping/dimming while
    // the film is actively playing. Without this, phones apply their normal
    // inactivity timeout and go dark mid-movie even though the video is
    // still running, since there's no touch input while just watching.
    const wakeLockRef = useRef<any>(null);
    useEffect(() => {
        if (isControllerMode) return;
        const nav = navigator as any;
        if (!nav.wakeLock) return; // unsupported browser — no-op

        const isActivelyPlaying = partyState?.status === 'live' && !isEnded && !isInIntermission;

        const requestWakeLock = async () => {
            try {
                wakeLockRef.current = await nav.wakeLock.request('screen');
            } catch (e) {
                // Can be refused (low battery, backgrounded, unsupported) — playback still works either way
            }
        };
        const releaseWakeLock = () => {
            wakeLockRef.current?.release?.().catch(() => {});
            wakeLockRef.current = null;
        };

        if (isActivelyPlaying) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // The OS/browser automatically releases the wake lock when the tab is
        // backgrounded — re-acquire it the moment the viewer comes back if
        // the film is still playing, otherwise the screen can sleep again.
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && isActivelyPlaying && !wakeLockRef.current) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [partyState?.status, isEnded, isInIntermission, isControllerMode]);

    // Always release the wake lock on unmount so it doesn't leak past this page
    useEffect(() => {
        return () => { wakeLockRef.current?.release?.().catch(() => {}); };
    }, []);

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

        // There's a next film — advance via the server. This used to write
        // straight to Firestore from the browser inside a transaction (the
        // transaction was there so that if every viewer's client detects
        // "ended" within the same ~1s window, only the first one actually
        // advances instead of each re-triggering a fresh serverTimestamp and
        // restarting the next film from 0). That direct client write is
        // exactly what firestore.rules blocks though — `watch_parties` is
        // server-only ("allow write: if false"). The API route below does the
        // identical guard server-side (re-reads activeMovieIndex and no-ops
        // if it's already moved on) using the Admin SDK, which isn't subject
        // to those rules, so every viewer can safely call it and only the
        // first one to land will actually change anything.
        fetch('/api/advance-block-film', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                partyId: movieKey,
                currentIndex: currentIdx,
                totalFilms: blockKeys.length,
            }),
        })
            .then(r => r.json())
            .then(d => {
                if (d.success === false) console.warn('[BLOCK AUTO-ADVANCE] Not advanced:', d.message || d.error);
            })
            .catch((err) => {
                // This was previously a silent no-op — if the write was
                // rejected, the film would just sit frozen on the "ended"
                // frame with zero indication why to anyone.
                console.error('[BLOCK AUTO-ADVANCE] Request failed:', err);
            });

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
        // (same || [] guard as the movie useMemo above — see that comment)
        const parentBlock = festivalData.flatMap(d => d.blocks || []).find(b => b.movieKeys.includes(movieKey));
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

    // ── SIGNED STREAM URL — DISABLED FOR NOW ────────────────────────────────
    // This briefly routed playback through api/get-stream-url.ts (a
    // time-limited signed CloudFront URL instead of the permanent public
    // movie.fullMovie link) as part of closing a piracy/paywall-bypass gap.
    // Turned out that endpoint was never actually finished being configured:
    // it rewrites every video URL onto the CloudFront distribution that
    // serves posters/logos/photos, not the one (if any) in front of the S3
    // bucket that actually hosts movie files (cratetelevision.s3...). Every
    // request through it was breaking — that's what was causing videos to
    // not start, get stuck, and need a refresh, worst on Android. Reverted
    // to the direct URL (the reliable, previously-working path) until
    // get-stream-url.ts is pointed at the right origin and this can be
    // safely turned back on.
    const playableUrl = movie?.fullMovie;

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
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">The movie will start at its scheduled start time</p>
                    {/* This used to be a small, low-contrast gray link — easy to miss, and
                        with nothing else on screen (no countdown, no price) it read as a
                        dead end. The lobby has the actual countdown/ticket info this screen
                        is missing, so make going there the obvious, primary next step. */}
                    <button
                        onClick={() => setShowLobby(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
                    >
                        View Countdown &amp; Details
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
                {hasAccess && playableUrl && (
                    <video
                        src={playableUrl}
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
            <>
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
                    onUpgradeToFullPass={() => setShowFullPassPaywall(true)}
                    nextBlock={nextBlockInfo}
                    onBuyNextBlock={handleBuyNextBlock}
                />
                {showPaywall && (
                    <SquarePaymentModal
                        movie={movie}
                        paymentType={parentBlock ? "block" : "watchPartyTicket"}
                        block={parentBlock || undefined}
                        onClose={() => setShowPaywall(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                )}
                {showNextBlockPaywall && nextBlockInfo && (
                    <SquarePaymentModal
                        paymentType="block"
                        block={nextBlockInfo}
                        onClose={() => setShowNextBlockPaywall(false)}
                        onPaymentSuccess={handleNextBlockPaymentSuccess}
                    />
                )}
                {showFullPassPaywall && (
                    <SquarePaymentModal
                        paymentType="pass"
                        // The server's grant check (process-square-payment.ts) looks
                        // for itemId === 'full-festival-pass' specifically — this
                        // synthetic block just carries that id through, same as the
                        // homepage's all-access purchase.
                        block={{ id: 'full-festival-pass', title: 'Festival All-Access Pass', time: '', movieKeys: [], price: 50 } as any}
                        onClose={() => setShowFullPassPaywall(false)}
                        onPaymentSuccess={async () => {
                            try { await grantFestivalAllAccess(); } catch (e) { console.error('grantFestivalAllAccess failed:', e); }
                            setTimeout(() => setShowFullPassPaywall(false), 1200);
                        }}
                    />
                )}
            </>
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
        <div className="fixed inset-0 flex flex-col bg-black text-white overflow-hidden">
                <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full">
                <div className="flex-grow flex flex-col relative h-full pb-80 md:pb-0">
                    <div className="p-3 bg-black/90 flex items-center justify-between">
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
                                            setVerifiedBackstageKey(key);
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
                                        {/* For block-based watch parties, price lives on the block, not the
                                            individual film — movie.watchPartyPrice is often unset there. This
                                            used to render literally "$undefined" for anyone who skipped the
                                            lobby (which already has this same fallback) and landed here
                                            directly. Match the lobby's fallback so it's never blank/broken. */}
                                        Get Ticket — ${(parentBlock?.price ?? movie.watchPartyPrice ?? 10).toFixed(2)}
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
                                    <div className="w-full h-full bg-gray-900 rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl relative" dangerouslySetInnerHTML={{ __html: processLiveEmbed(movie.liveStreamEmbed!) }} />
                                </div>
                            ) : (
                                <div className="relative w-full h-full">
                                    {/* Buffering spinner — shows until video has enough data to play */}
                                    {/* Blurred backdrop for non-16:9 films — uses the poster image, not a second
                                        decoded video stream, so we don't double the decode/network load on the
                                        real player (that duplicate <video> was a cause of playback stutter) */}
                                    {movie.poster && (
                                        <img
                                            src={movie.poster}
                                            alt=""
                                            aria-hidden="true"
                                            className={`absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40 pointer-events-none transition-opacity duration-1000 ${isEnded ? 'opacity-0' : 'opacity-40'}`}
                                        />
                                    )}
                                    <video
                                        ref={videoRef}
                                        src={playableUrl}
                                        className={`relative w-full h-full object-contain transition-opacity duration-700 ${isEnded ? 'opacity-30 blur-xl' : hasStartedPlaying ? 'opacity-100' : 'opacity-0'}`}
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
                                        onError={() => {
                                            // Previously nothing handled this at all — a 404'd source, an
                                            // unsupported codec on an older Android phone, or any other
                                            // native playback failure just left a permanently black/frozen
                                            // video with zero indication anything had gone wrong.
                                            const err = videoRef.current?.error;
                                            console.error('[Video] playback error', err?.code, err?.message);
                                            setVideoError('Playback error. Tap to try again.');
                                        }}
                                        onEnded={() => {
                                            // Fire immediately on the real browser "ended" event so auto-advance
                                            // doesn't depend solely on the server-clock drift check in the sync
                                            // engine (which could miss the boundary if durationInMinutes was off).
                                            if (!isEndedRef.current) setIsEnded(true);
                                        }}
                                    />
                                    {videoError && !isEnded && (
                                        <div className="absolute inset-0 z-[168] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-center p-8 gap-4">
                                            <p className="text-white font-black uppercase tracking-widest text-sm max-w-xs">{videoError}</p>
                                            <button
                                                onClick={() => {
                                                    setVideoError(null);
                                                    const video = videoRef.current;
                                                    if (!video) return;
                                                    video.load();
                                                    video.play().catch(() => {});
                                                }}
                                                className="bg-white text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full active:scale-95 transition-all"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                    {/* Buffering overlay — isVideoBuffering was already tracked (onWaiting/
                                        onStalled/onCanPlay above) but never actually shown to the viewer, so
                                        someone on a slow connection just saw a frozen frame with no explanation
                                        of what was happening or that anything was happening at all. */}
                                    {isVideoBuffering && !isEnded && (
                                        <div className="absolute inset-0 z-[165] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                                            <div className="relative w-10 h-10 mb-4">
                                                <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                                                <div className="absolute inset-0 rounded-full border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300">Buffering — hang tight</p>
                                        </div>
                                    )}
                                    {/* Small unmute button — video autoplays muted, tap to unmute */}
                                    {needsUserGesture && partyState?.status === 'live' && !isEnded && (
                                        <button
                                            className="absolute bottom-4 right-4 z-[170] flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-6 py-4 min-h-[48px] text-white hover:bg-black/90 transition-all active:scale-95 shadow-lg"
                                            onClick={() => {
                                                const video = videoRef.current;
                                                hasUserInteractedRef.current = true;
                                                setNeedsUserGesture(false);
                                                if (!video) return;
                                                video.muted = false;

                                                // Reported "stuck on tap" on Android: on some Android/Chrome +
                                                // hls.js combinations, unmuting an already-playing HLS stream
                                                // triggers a brief stall — the audio data wasn't necessarily
                                                // being kept as tightly buffered while muted, so there's a
                                                // catch-up moment right as sound turns on. A single
                                                // play().catch(() => {}) with no retry just silently gives up
                                                // if that happens, and a *resolved* play() promise doesn't
                                                // actually guarantee the decoder resumed either — so check
                                                // real paused state a few times after tapping and retry if
                                                // it's still stuck, instead of trusting one attempt.
                                                const tryPlay = () => { video.play().catch(() => {}); };
                                                tryPlay();
                                                [400, 1000, 2000].forEach(delay => {
                                                    setTimeout(() => { if (video.paused) tryPlay(); }, delay);
                                                });
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            </svg>
                                            <span className="text-[11px] font-black uppercase tracking-widest">Tap to Unmute</span>
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

                    {/* On short phones (iPhone SE and similar), the mobile keyboard plus
                        the chat drawer sliding up to clear it can reach far enough to
                        cover this row, making reactions un-tappable and confusing while
                        typing. Collapsing it while the keyboard is open (mobile only —
                        keyboardOffset never leaves 0 on desktop, which has no virtual
                        keyboard) avoids that overlap; it's not something anyone needs
                        while actively composing a chat message anyway. */}
                    <div
                        className={`p-4 bg-black/40 flex justify-center gap-2 md:gap-8 backdrop-blur-xl overflow-hidden transition-all duration-200 ${keyboardOffset > 0 ? 'max-h-0 !p-0 opacity-0' : 'max-h-24 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {REACTION_TYPES.map(emoji => (
                            <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); logSentiment(emoji); }}
                                // min-w/min-h guarantee a real ~48px tap target regardless of how
                                // small the emoji glyph itself renders — on a 390px phone with 5
                                // buttons, relying on font-size alone for the hit area made
                                // adjacent reactions easy to mis-tap, especially one-handed.
                                className="min-w-[3rem] min-h-[3rem] flex items-center justify-center text-4xl md:text-5xl hover:scale-150 active:scale-90 transition-transform drop-shadow-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* Mobile chat — docked as a fixed panel at the bottom, with its own
                        reserved space (see pb-80 on the container above) so it never
                        overlaps the video or the reaction bar above it. It only moves via
                        translateY when the keyboard opens, sliding up above the keyboard —
                        the video itself never resizes or shifts. */}
                    <div
                        className="md:hidden fixed left-0 right-0 bottom-0 z-40 h-80 flex flex-col overflow-hidden bg-[#0a0a0a] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
                        style={{
                            transform: `translateY(-${keyboardOffset}px)`,
                            paddingBottom: keyboardOffset > 0 ? 0 : 'env(safe-area-inset-bottom)',
                            transition: 'transform 0.15s ease-out',
                        }}
                    >
                        <EmbeddedChat
                            partyKey={movieKey}
                            directors={[]}
                            isQALive={partyState?.isQALive}
                            user={user}
                            isBackstageVerified={isBackstageVerified}
                            verifiedBackstageKey={verifiedBackstageKey}
                            onBackstageVerify={(key) => {
                                if (partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                    setIsBackstageVerified(true);
                                    setVerifiedBackstageKey(key);
                                    unlockWatchParty(movieKey);
                                } else {
                                    toast.error("Invalid access key.");
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="hidden md:flex w-96 flex-shrink-0 h-full">
                    <EmbeddedChat
                        partyKey={movieKey}
                        directors={[]}
                        isQALive={partyState?.isQALive}
                        user={user}
                        isBackstageVerified={isBackstageVerified}
                        verifiedBackstageKey={verifiedBackstageKey}
                        onBackstageVerify={(key) => {
                            if (partyState?.backstageKey && key.toUpperCase() === partyState.backstageKey.toUpperCase()) {
                                setIsBackstageVerified(true);
                                setVerifiedBackstageKey(key);
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
