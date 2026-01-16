
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, WatchPartyState, ChatMessage, SentimentPoint, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';
import Countdown from './Countdown';

interface WatchPartyPageProps {
  movieKey: string; // This can be a movieKey OR a blockId
}

const REACTION_TYPES = ['🔥', '😲', '❤️', '👏', '😢'] as const;

const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ff0000&title=0&byline=0&portrait=0`;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    return null;
};

const FloatingReaction: React.FC<{ emoji: string; onComplete: () => void }> = ({ emoji, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 85) + 5, []); 
    const randomDuration = useMemo(() => 2.5 + Math.random() * 2, []); 
    const randomScale = useMemo(() => 0.7 + Math.random() * 0.9, []); 
    const randomRotate = useMemo(() => Math.floor(Math.random() * 40) - 20, []);

    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);

    return (
        <div 
            className="absolute bottom-0 pointer-events-none text-5xl animate-emoji-float z-[60]"
            style={{ 
                left: `${randomLeft}%`, 
                animationDuration: `${randomDuration}s`,
                transform: `scale(${randomScale}) rotate(${randomRotate}deg)`
            }}
        >
            {emoji}
        </div>
    );
};

const PreShowLobby: React.FC<{ 
    movie?: Movie; 
    block?: FilmBlock; 
    allMovies: Movie[]; 
    startTime: string;
}> = ({ movie, block, allMovies, startTime }) => {
    const [currentTrailerIdx, setCurrentTrailerIdx] = useState(0);
    const lobbyAudioRef = useRef<HTMLAudioElement>(null);
    const [audioStarted, setAudioStarted] = useState(false);

    const promotionMovies = useMemo(() => {
        return allMovies
            .filter(m => m.trailer && (!movie || m.key !== movie.key))
            .sort(() => Math.random() - 0.5);
    }, [allMovies, movie]);

    useEffect(() => {
        if (promotionMovies.length > 0) {
            const interval = setInterval(() => {
                setCurrentTrailerIdx(prev => (prev + 1) % promotionMovies.length);
            }, 20000);
            return () => clearInterval(interval);
        }
    }, [promotionMovies]);

    const startLobbyAudio = () => {
        if (lobbyAudioRef.current && !audioStarted) {
            lobbyAudioRef.current.play().catch(e => console.log("Audio waiting for user interaction"));
            setAudioStarted(true);
        }
    };

    const title = block ? block.title : (movie ? movie.title : 'Loading Session...');
    const backdrop = movie?.poster || 'https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg';

    return (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden animate-[fadeIn_0.5s_ease-out]" onClick={startLobbyAudio}>
            <div className="absolute inset-0 opacity-40">
                {promotionMovies.length > 0 ? (
                    <video 
                        key={promotionMovies[currentTrailerIdx].key}
                        src={promotionMovies[currentTrailerIdx].trailer}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover blur-sm"
                    />
                ) : (
                    <img src={backdrop} className="w-full h-full object-cover blur-2xl" alt="" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>
            </div>

            <div className="relative z-10 text-center space-y-12 max-w-4xl px-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-6 py-2 rounded-full shadow-2xl mb-6">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Pre-Show Lobby // Global Sync Active</p>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">Uplink Imminent</p>
                        <h2 className="text-5xl md:text-[6rem] font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                            {title}
                        </h2>
                    </div>
                </div>

                <div className="bg-black/60 backdrop-blur-xl px-12 py-8 rounded-[3rem] border border-white/10 inline-flex flex-col items-center gap-6 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.3em]">Session Starts In</p>
                        <div className="w-px h-6 bg-white/10"></div>
                        <Countdown targetDate={startTime} className="text-4xl md:text-6xl font-black text-white font-mono tracking-tighter" prefix="" />
                    </div>
                    {block && (
                        <div className="flex gap-4">
                             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Films in Block: {block.movieKeys.length}</p>
                        </div>
                    )}
                </div>
            </div>

            <audio ref={lobbyAudioRef} src="https://cratetelevision.s3.us-east-1.amazonaws.com/ambient-lobby-loop.mp3" loop />
        </div>
    );
};

const LiveTalkbackTerminal: React.FC<{ 
    title: string;
    director: string;
    isSpeaker: boolean; 
    userName: string; 
    backstageKeyMatch?: string;
    onManualSpeakerUnlock: (key: string) => void;
    showKeyInputInitially?: boolean;
}> = ({ title, director, isSpeaker, userName, backstageKeyMatch, onManualSpeakerUnlock, showKeyInputInitially = false }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [showKeyInput, setShowKeyInput] = useState(showKeyInputInitially);
    const [enteredKey, setEnteredKey] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);

    const startBroadcast = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (e) {
            alert("Camera access denied.");
        }
    };

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (backstageKeyMatch && enteredKey.trim().toUpperCase() === backstageKeyMatch.toUpperCase()) {
            onManualSpeakerUnlock(enteredKey.trim());
            setShowKeyInput(false);
        } else {
            alert("Invalid Backstage Access Key.");
        }
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
            <div className="relative z-10 w-full max-w-4xl px-6 text-center">
                <div className="inline-flex items-center gap-2 bg-red-600 px-4 py-1 rounded-full mb-8 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Talkback Session</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">Post-Film Q&A</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-12">Moderating: Crate TV Studio // Guest: {director}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="aspect-video bg-gray-900 rounded-3xl border border-white/10 relative overflow-hidden flex items-center justify-center group">
                        <div className="absolute top-4 left-4 z-20 bg-black/60 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-red-500 border border-red-500/30">Host // Studio</div>
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-24 opacity-10 group-hover:opacity-20 transition-opacity" alt="" />
                    </div>
                    <div className="aspect-video bg-gray-900 rounded-3xl border border-red-600/30 relative overflow-hidden flex items-center justify-center shadow-2xl">
                         {cameraActive ? (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                         ) : (
                            <div className="text-center p-8">
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    {isSpeaker ? `Ready for Uplink: ${userName}` : `Speaker Slot Reserved: ${director}`}
                                </p>
                            </div>
                         )}
                         <div className="absolute top-4 left-4 z-20 bg-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white">Guest // Primary</div>
                    </div>
                </div>
                {isSpeaker && !cameraActive && (
                    <button onClick={startBroadcast} className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl">Activate Stage Camera</button>
                )}
            </div>
        </div>
    );
};

const EmbeddedChat: React.FC<{ 
    partyKey: string; 
    directors: string[];
    user: { name?: string; email: string | null; avatar?: string; } | null 
}> = ({ partyKey, directors, user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        setIsSending(true);
        try {
            await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: partyKey, userName: user.name || user.email, userAvatar: user.avatar || 'fox', text: newMessage }),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0a0a] md:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-hidden min-h-0">
            <div className="hidden md:flex p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0">
                <h2 className="text-sm uppercase tracking-widest text-gray-400">Live Chat</h2>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
                {messages.map(msg => {
                    const isDirector = directors.includes(msg.userName.toLowerCase().trim());
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] ${isDirector ? 'bg-red-600/5 p-3 rounded-2xl border border-red-500/10' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 p-1 border ${isDirector ? 'border-red-500 bg-red-600/20' : 'border-white/5 bg-gray-800'}`} dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`font-black text-[11px] uppercase tracking-tighter ${isDirector ? 'text-white' : 'text-red-500'}`}>{msg.userName}</p>
                                    {isDirector && <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">Director</span>}
                                </div>
                                <p className={`text-sm break-words leading-snug ${isDirector ? 'text-white font-medium' : 'text-gray-200'}`}>{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-4 py-1 border border-white/10">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500 hover:text-red-400 disabled:text-gray-600 transition-colors" disabled={!user || isSending || !newMessage.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty, unlockedBlockIds } = useAuth();
    const { movies: allMovies, festivalData, isLoading: isFestivalLoading } = useFestival();
    
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [activeMovieKey, setActiveMovieKey] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showBackstageVerification, setShowBackstageVerification] = useState(false);
    const [manualSpeakerKey, setManualSpeakerKey] = useState<string | null>(null);
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);

    // Resolve Context: Single Movie or Block
    const context = useMemo(() => {
        const movie = allMovies[movieKey];
        if (movie) return { type: 'movie' as const, movie };
        
        const allBlocks = festivalData.flatMap(d => d.blocks);
        const block = allBlocks.find(b => b.id === movieKey);
        if (block) return { type: 'block' as const, block };
        
        return null;
    }, [movieKey, allMovies, festivalData]);

    const hasAccess = useMemo(() => {
        if (context?.type === 'movie') {
            if (!context.movie.isWatchPartyPaid) return true;
            return unlockedWatchPartyKeys.has(movieKey);
        } else if (context?.type === 'block') {
            return unlockedBlockIds.has(movieKey);
        }
        return false;
    }, [context, movieKey, unlockedWatchPartyKeys, unlockedBlockIds]);

    const isSpeakerCandidate = useMemo(() => {
        if (manualSpeakerKey && manualSpeakerKey === partyState?.backstageKey) return true;
        if (!user?.name || !context) return false;
        const normalized = user.name.toLowerCase().trim();
        const movie = context.type === 'movie' ? context.movie : allMovies[activeMovieKey || ''];
        if (!movie) return false;
        const directors = movie.director.toLowerCase().split(',').map(d => d.trim());
        return directors.includes(normalized);
    }, [user, context, activeMovieKey, manualSpeakerKey, partyState?.backstageKey, allMovies]);

    const directorsList = useMemo(() => {
        if (context?.type === 'movie') return context.movie.director.toLowerCase().split(',').map(d => d.trim());
        if (context?.type === 'block') {
            return context.block.movieKeys.flatMap(k => allMovies[k]?.director.toLowerCase().split(',').map(d => d.trim())).filter(Boolean);
        }
        return [];
    }, [context, allMovies]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const partyRef = db.collection('watch_parties').doc(movieKey);
        const unsubscribe = partyRef.onSnapshot(doc => {
            if (doc.exists) setPartyState(doc.data() as WatchPartyState);
        });

        const tenSecondsAgo = new Date(Date.now() - 10000);
        const reactionsRef = partyRef.collection('live_reactions')
            .where('timestamp', '>=', tenSecondsAgo)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && change.doc.data().userId !== user?.uid) {
                        setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: change.doc.data().emoji }]);
                    }
                });
            });

        return () => { unsubscribe(); reactionsRef(); };
    }, [movieKey, user?.uid]);

    // SECURE PRESENCE HEARTBEAT (Binds node to specific party ID)
    useEffect(() => {
        const db = getDbInstance();
        if (!db || !user) return;

        const updatePresence = () => {
            db.collection('presence').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                currentPath: window.location.pathname,
                currentPartyId: movieKey // Canonical binding for admin viewer count
            }, { merge: true });
        };

        updatePresence();
        const interval = setInterval(updatePresence, 30000);

        return () => {
            clearInterval(interval);
            // Cleanup: Clear party ID when leaving the room
            db.collection('presence').doc(user.uid).update({ currentPartyId: null }).catch(() => {});
        };
    }, [user, movieKey]);

    // SEQUENTIAL BLOCK SYNC ENGINE
    useEffect(() => {
        if (!hasAccess || !partyState?.actualStartTime || partyState.isQALive) return;
        
        const syncClock = setInterval(() => {
            const serverStart = partyState.actualStartTime.toDate ? partyState.actualStartTime.toDate().getTime() : new Date(partyState.actualStartTime).getTime();
            const elapsedTotalSeconds = (Date.now() - serverStart) / 1000;
            
            if (elapsedTotalSeconds < 0) return; // Still waiting

            if (context?.type === 'movie') {
                const video = videoRef.current;
                if (video) {
                    if (Math.abs(video.currentTime - elapsedTotalSeconds) > 2) video.currentTime = elapsedTotalSeconds;
                    if (video.paused) video.play().catch(() => {});
                    setActiveMovieKey(context.movie.key);
                }
            } else if (context?.type === 'block') {
                let accumulatedTime = 0;
                let foundActive = false;

                for (const key of context.block.movieKeys) {
                    const m = allMovies[key];
                    if (!m) continue;
                    const duration = (m.durationInMinutes || 10) * 60;
                    
                    if (elapsedTotalSeconds >= accumulatedTime && elapsedTotalSeconds < accumulatedTime + duration) {
                        const movieElapsed = elapsedTotalSeconds - accumulatedTime;
                        if (activeMovieKey !== key) setActiveMovieKey(key);
                        
                        const video = videoRef.current;
                        if (video) {
                            if (Math.abs(video.currentTime - movieElapsed) > 2) video.currentTime = movieElapsed;
                            if (video.paused) video.play().catch(() => {});
                        }
                        foundActive = true;
                        break;
                    }
                    accumulatedTime += duration;
                }
                
                if (!foundActive && partyState.status !== 'ended') {
                    // Entire block is finished
                    setActiveMovieKey(null);
                }
            }
        }, 1000);

        return () => clearInterval(syncClock);
    }, [partyState, hasAccess, context, activeMovieKey, allMovies]);

    const logSentiment = async (emoji: string) => {
        setLocalReactions(prev => [...prev, { id: `local_${Date.now()}`, emoji }]);
        const db = getDbInstance();
        if (db) {
            db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({
                emoji,
                userId: user?.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isFestivalLoading || !context) return <LoadingSpinner />;

    const startTimeStr = context.type === 'movie' ? context.movie.watchPartyStartTime : context.block.watchPartyStartTime;
    const startTime = startTimeStr ? new Date(startTimeStr) : null;
    const isWaiting = startTime && new Date() < startTime;
    const isFinished = partyState?.status === 'ended';

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black">
                     <img src={context.type === 'movie' ? context.movie.poster : ''} className="w-full h-full object-cover blur-3xl opacity-20" alt="" />
                </div>
                <div className="relative z-10 space-y-8 max-w-lg">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Entry Ticket Required</h2>
                    <p className="text-gray-400 leading-relaxed font-medium">This live screening for <strong className="text-white">"{context.type === 'movie' ? context.movie.title : context.block.title}"</strong> is a ticketed community event.</p>
                    <button onClick={() => setShowPaywall(true)} className="bg-white text-black font-black py-5 px-12 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all">Get Event Ticket</button>
                    <button onClick={handleGoHome} className="text-[10px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest">Return to Home</button>
                </div>
                {showPaywall && (
                    <SquarePaymentModal 
                        movie={context.type === 'movie' ? context.movie : undefined} 
                        block={context.type === 'block' ? context.block as any : undefined}
                        paymentType={context.type === 'movie' ? "watchPartyTicket" : "block"} 
                        onClose={() => setShowPaywall(false)} 
                        onPaymentSuccess={() => {
                            if (context.type === 'movie') unlockWatchParty(movieKey);
                            setShowPaywall(false);
                        }} 
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
            <style>{`
                @keyframes emojiFloat {
                    0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
                    10% { opacity: 1; transform: translateY(-20px) rotate(5deg) scale(1.2); }
                    100% { transform: translateY(-600px) rotate(-15deg) scale(0.8); opacity: 0; }
                }
                .animate-emoji-float {
                    animation: emojiFloat 3.5s cubic-bezier(0.33, 1, 0.68, 1) forwards;
                }
            `}</style>

            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full min-h-0">
                <div className="flex-grow flex flex-col relative h-full min-h-0">
                    <div className="flex-none bg-black/90 backdrop-blur-md p-3 flex items-center justify-between border-b border-white/5 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="text-center min-w-0 px-4">
                             <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${partyState?.status === 'live' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-red-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${partyState?.status === 'live' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-red-600'}`}></span>
                                </span>
                                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">LIVE {context.type === 'block' ? 'BLOCK' : 'SCREENING'}</p>
                            </div>
                            <h2 className="text-xs font-bold truncate text-gray-200">{context.type === 'movie' ? context.movie.title : context.block.title}</h2>
                        </div>
                        <button onClick={() => setShowBackstageVerification(!showBackstageVerification)} className="bg-white/5 border border-white/10 text-gray-500 hover:text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Backstage</button>
                    </div>

                    <div className="flex-grow w-full bg-black relative shadow-2xl z-30 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {isWaiting && partyState?.status !== 'live' && (
                             <PreShowLobby movie={context.type === 'movie' ? context.movie : undefined} block={context.type === 'block' ? context.block : undefined} allMovies={Object.values(allMovies)} startTime={startTimeStr!} />
                        )}

                        {isFinished && (
                            <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic mb-8">Transmission End.</h2>
                                <button onClick={handleGoHome} className="bg-white text-black font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs">Return to Catalog</button>
                            </div>
                        )}

                        {partyState?.isQALive ? (
                            <LiveTalkbackTerminal 
                                title={context.type === 'movie' ? context.movie.title : context.block.title}
                                director={context.type === 'movie' ? context.movie.director : "Group Panel"}
                                isSpeaker={isSpeakerCandidate} 
                                userName={user?.name || "Guest Creator"}
                                backstageKeyMatch={partyState.backstageKey}
                                onManualSpeakerUnlock={setManualSpeakerKey}
                                showKeyInputInitially={showBackstageVerification}
                            />
                        ) : (
                            <div className="flex-grow flex items-center justify-center">
                                {activeMovieKey ? (
                                    <video ref={videoRef} src={allMovies[activeMovieKey]?.fullMovie} className="w-full h-full object-contain" playsInline autoPlay />
                                ) : (
                                    <div className="text-center space-y-4 opacity-30">
                                        <p className="text-xs font-black uppercase tracking-[1em] mr-[-1em]">Establishing Uplink...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-none bg-black/40 border-b border-white/5 py-4 px-4 flex flex-col items-center gap-4 z-40">
                         <div className="flex justify-around w-full max-w-md">
                            {REACTION_TYPES.map(emoji => (
                                <button key={emoji} onClick={() => logSentiment(emoji)} className="text-2xl md:text-4xl hover:scale-150 transition-transform p-2">{emoji}</button>
                            ))}
                         </div>
                    </div>
                    
                    <div className="flex-grow flex flex-col md:hidden overflow-hidden bg-[#0a0a0a] min-h-0 relative">
                        <EmbeddedChat partyKey={movieKey} directors={directorsList} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat partyKey={movieKey} directors={directorsList} user={user} />
                </div>
            </div>
        </div>
    );
};
