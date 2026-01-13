
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, WatchPartyState, ChatMessage, SentimentPoint } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';

interface WatchPartyPageProps {
  movieKey: string;
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

const SecureWatermark: React.FC<{ email: string; isTriggered: boolean }> = ({ email, isTriggered }) => (
    <div className={`absolute inset-0 pointer-events-none z-[45] overflow-hidden select-none transition-opacity duration-1000 ${isTriggered ? 'opacity-20' : 'opacity-0'}`}>
        <div className="dynamic-watermark absolute whitespace-nowrap bg-white/20 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.3em] border border-white/10 backdrop-blur-md shadow-2xl">
            SECURITY TRACE // {email.toUpperCase()} // AUTH_ENFORCED
        </div>
    </div>
);

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

const LiveTalkbackTerminal: React.FC<{ 
    movie: Movie; 
    isSpeaker: boolean; 
    userName: string; 
    backstageKeyMatch?: string;
    onManualSpeakerUnlock: (key: string) => void;
}> = ({ movie, isSpeaker, userName, backstageKeyMatch, onManualSpeakerUnlock }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [showKeyInput, setShowKeyInput] = useState(false);
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
            alert("Camera access denied. You can still participate via audio or chat.");
        }
    };

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (backstageKeyMatch && enteredKey.trim().toUpperCase() === backstageKeyMatch.toUpperCase()) {
            onManualSpeakerUnlock(enteredKey.trim());
            setShowKeyInput(false);
        } else {
            alert("Invalid Backstage Access Key. Access Denied.");
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
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-12">Moderating: Crate TV Studio // Guest: {movie.director}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="aspect-video bg-gray-900 rounded-3xl border border-white/10 relative overflow-hidden flex items-center justify-center group">
                        <div className="absolute top-4 left-4 z-20 bg-black/60 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-red-500 border border-red-500/30">Host // Studio</div>
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-24 opacity-10 group-hover:opacity-20 transition-opacity" alt="" />
                        <div className="text-[10px] font-bold text-gray-700 uppercase">Awaiting Studio Uplink...</div>
                    </div>

                    <div className="aspect-video bg-gray-900 rounded-3xl border border-red-600/30 relative overflow-hidden flex items-center justify-center shadow-2xl">
                         {cameraActive ? (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                         ) : (
                            <div className="text-center p-8">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    {isSpeaker ? `Ready for Uplink: ${userName}` : `Speaker Slot Reserved: ${movie.director}`}
                                </p>
                            </div>
                         )}
                         <div className="absolute top-4 left-4 z-20 bg-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white">Guest // Primary</div>
                    </div>
                </div>

                {isSpeaker ? (
                    !cameraActive && (
                        <button 
                            onClick={startBroadcast}
                            className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl"
                        >
                            Activate Stage Camera
                        </button>
                    )
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl inline-block">
                            <p className="text-sm text-gray-400 font-medium">The audience is now listening. <span className="text-white font-bold">Ask your questions</span> in the chat below!</p>
                        </div>
                        
                        {!showKeyInput ? (
                            <button 
                                onClick={() => setShowKeyInput(true)} 
                                className="block mx-auto text-[10px] font-black uppercase text-gray-700 hover:text-red-500 tracking-widest transition-colors"
                            >
                                Have a Backstage Key?
                            </button>
                        ) : (
                            <form onSubmit={handleKeySubmit} className="max-w-xs mx-auto flex gap-2">
                                <input 
                                    type="text" 
                                    value={enteredKey}
                                    onChange={e => setEnteredKey(e.target.value)}
                                    placeholder="ACCESS_KEY"
                                    className="bg-black border border-white/20 rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest text-white focus:border-red-600 outline-none w-full"
                                    autoFocus
                                />
                                <button type="submit" className="bg-white text-black px-4 py-2 rounded-lg font-black text-[10px] uppercase">Verify</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const EmbeddedChat: React.FC<{ movieKey: string; user: { name?: string; email: string | null; avatar?: string; } | null }> = ({ movieKey, user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(100);
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => { fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage); });
            setMessages(fetchedMessages);
        });
        return () => unsubscribe();
    }, [movieKey]);

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
                body: JSON.stringify({ movieKey, userName: user.name || user.email, userAvatar: user.avatar || 'fox', text: newMessage }),
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
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-8">
                        <p className="text-gray-600 text-sm italic">Screening in progress. Join the conversation!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 p-1 border border-white/5" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                            <div className="min-w-0">
                                <p className="font-black text-[11px] text-red-500 uppercase tracking-tighter">{msg.userName}</p>
                                <p className="text-sm text-gray-200 break-words leading-snug">{msg.text}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-4 py-1 border border-white/10 focus-within:border-red-600/50 transition-colors">
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        placeholder="Type a message..." 
                        className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-gray-500 py-2.5" 
                        disabled={!user || isSending} 
                    />
                    <button 
                        type="submit" 
                        className="text-red-500 hover:text-red-400 disabled:text-gray-600 p-1 transition-colors" 
                        disabled={!user || isSending || !newMessage.trim()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading } = useFestival();
    const movie = allMovies[movieKey];
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [manualSpeakerKey, setManualSpeakerKey] = useState<string | null>(null);
    const [isSecurityTriggered, setIsSecurityTriggered] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const securityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);

    const hasAccess = useMemo(() => {
        if (!movie?.isWatchPartyPaid) return true;
        return unlockedWatchPartyKeys.has(movieKey);
    }, [movie, unlockedWatchPartyKeys, movieKey]);

    const embedUrl = useMemo(() => movie ? getEmbedUrl(movie.fullMovie) : null, [movie]);

    // SECURITY: Detect recording behavior
    useEffect(() => {
        const triggerSecurity = () => {
            setIsSecurityTriggered(true);
            if (securityTimeoutRef.current) clearTimeout(securityTimeoutRef.current);
            securityTimeoutRef.current = setTimeout(() => setIsSecurityTriggered(false), 8000);
        };

        const handleKeydown = (e: KeyboardEvent) => {
            const blockedKeys = ['PrintScreen', 'F12', 'F11'];
            const blockedCombos = (e.ctrlKey || e.metaKey) && ['s', 'u', 'i', 'j', 'c'].includes(e.key.toLowerCase());
            if (blockedKeys.includes(e.key) || blockedCombos) {
                triggerSecurity();
            }
        };

        const handleFocusOut = () => triggerSecurity();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') triggerSecurity();
        };

        window.addEventListener('keydown', handleKeydown, true);
        window.addEventListener('blur', handleFocusOut);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            window.removeEventListener('keydown', handleKeydown, true);
            window.removeEventListener('blur', handleFocusOut);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (securityTimeoutRef.current) clearTimeout(securityTimeoutRef.current);
        };
    }, []);

    const isSpeakerCandidate = useMemo(() => {
        if (manualSpeakerKey && manualSpeakerKey === partyState?.backstageKey) return true;
        if (!user?.name || !movie) return false;
        const normalized = user.name.toLowerCase().trim();
        const directors = movie.director.toLowerCase().split(',').map(d => d.trim());
        const producers = (movie.producers || '').toLowerCase().split(',').map(p => p.trim());
        return directors.includes(normalized) || producers.includes(normalized);
    }, [user, movie, manualSpeakerKey, partyState?.backstageKey]);

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
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        if (data.userId !== user?.uid) {
                            setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: data.emoji }]);
                        }
                    }
                });
            });

        return () => {
            unsubscribe();
            reactionsRef();
        };
    }, [movieKey, user?.uid]);

    useEffect(() => {
        if (!hasAccess || embedUrl || partyState?.isQALive) return; 
        const video = videoRef.current;
        if (!video) return;
        const handleCanPlay = () => setIsVideoReady(true);
        video.addEventListener('canplay', handleCanPlay);
        return () => { if (video) video.removeEventListener('canplay', handleCanPlay); };
    }, [hasAccess, embedUrl, partyState?.isQALive]);

    useEffect(() => {
        if (!hasAccess || embedUrl || partyState?.isQALive) return; 
        const video = videoRef.current;
        if (!video || !partyState) return;

        if (partyState.isPlaying && video.paused) {
            video.play().catch(e => console.warn("Autoplay prevented", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 5) {
            video.currentTime = partyState.currentTime;
        }
    }, [partyState, hasAccess, embedUrl]);

    const logSentiment = async (emoji: string) => {
        const localId = `local_${Date.now()}_${Math.random()}`;
        setLocalReactions(prev => [...prev, { id: localId, emoji }]);

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

    const handleShareSession = async () => {
        const shareData = {
            title: `Crate TV Live: ${movie.title}`,
            text: `Join me for a live screening of "${movie.title}" on Crate TV! Interaction and Q&A active.`,
            url: window.location.href
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                navigator.clipboard.writeText(window.location.href);
                alert("Invitation link copied to clipboard.");
            }
        } catch (e) {}
    };

    const handleTicketSuccess = async () => {
        await unlockWatchParty(movieKey);
        setShowPaywall(false);
    };

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black">
                     <img src={movie.poster} className="w-full h-full object-cover blur-3xl opacity-20" alt="" />
                </div>
                <div className="relative z-10 space-y-8 max-w-lg">
                    <img src={movie.poster} className="w-48 mx-auto rounded-3xl shadow-2xl border border-white/10" alt="" />
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Ticket Required</h2>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Secure Live Screening Event</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">The live screening for <strong className="text-white">"{movie.title}"</strong> is a ticketed community event. Access includes the master broadcast and interactive Q&A session.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => setShowPaywall(true)}
                            className="bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all active:scale-95"
                        >
                            Get Event Ticket // ${movie.watchPartyPrice}
                        </button>
                        <button onClick={handleGoHome} className="text-[10px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest">Return to Home</button>
                    </div>
                </div>
                {showPaywall && (
                    <SquarePaymentModal 
                        movie={movie} 
                        paymentType="watchPartyTicket" 
                        onClose={() => setShowPaywall(false)} 
                        onPaymentSuccess={handleTicketSuccess} 
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden overscroll-none" onContextMenu={(e) => e.preventDefault()}>
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
                        <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors" aria-label="Back to Home"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="text-center min-w-0 px-4 flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                </span>
                                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">LIVE SCREENING</p>
                            </div>
                            <h2 className="text-xs font-bold truncate text-gray-200">{movie.title}</h2>
                        </div>
                        <button onClick={handleShareSession} className="text-gray-400 hover:text-white p-2">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                    </div>

                    <div className="flex-none w-full aspect-video bg-black relative shadow-2xl z-30 overflow-hidden">
                        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction 
                                    key={r.id} 
                                    emoji={r.emoji} 
                                    onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} 
                                />
                            ))}
                        </div>

                        {user?.email && <SecureWatermark email={user.email} isTriggered={isSecurityTriggered} />}
                        
                        {partyState?.isQALive ? (
                            <LiveTalkbackTerminal 
                                movie={movie} 
                                isSpeaker={isSpeakerCandidate} 
                                userName={user?.name || "Guest Creator"}
                                backstageKeyMatch={partyState.backstageKey}
                                onManualSpeakerUnlock={setManualSpeakerKey}
                            />
                        ) : (
                            embedUrl ? (
                                <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen title={movie.title}></iframe>
                            ) : (
                                <>
                                    {!isVideoReady && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                                            <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="w-full h-full object-cover blur-sm opacity-50" crossOrigin="anonymous" />
                                            <div className="absolute"><LoadingSpinner /></div>
                                        </div>
                                    )}
                                    <video ref={videoRef} src={movie.fullMovie} className={`w-full h-full transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} playsInline autoPlay onContextMenu={(e) => e.preventDefault()} />
                                </>
                            )
                        )}
                    </div>

                    <div className="flex-none bg-black/40 border-b border-white/5 py-4 px-4 flex flex-col items-center gap-4 z-40">
                         <div className="flex justify-around w-full max-w-md">
                            {REACTION_TYPES.map(emoji => (
                                <button 
                                    key={emoji} 
                                    onClick={() => logSentiment(emoji)} 
                                    className="text-2xl md:text-4xl hover:scale-150 active:scale-125 transition-transform drop-shadow-xl p-2 rounded-full transform"
                                    aria-label={`React with ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-[8px] font-black uppercase text-gray-600 tracking-[0.4em]">Group Pulse Active // Global Sync</span>
                         </div>
                    </div>
                    
                    <div className="flex-grow flex flex-col md:hidden overflow-hidden bg-[#0a0a0a] min-h-0 relative">
                        <EmbeddedChat movieKey={movieKey} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat movieKey={movieKey} user={user} />
                </div>
            </div>
        </div>
    );
};
