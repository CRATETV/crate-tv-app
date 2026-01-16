
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, WatchPartyState, ChatMessage, SentimentPoint } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';
import Countdown from './Countdown';

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

const PreShowLobby: React.FC<{ movie: Movie; allMovies: Movie[] }> = ({ movie, allMovies }) => {
    const [currentTrailerIdx, setCurrentTrailerIdx] = useState(0);
    const lobbyAudioRef = useRef<HTMLAudioElement>(null);
    const [audioStarted, setAudioStarted] = useState(false);

    // Filter movies that actually have trailers to show in the loop
    const promotionMovies = useMemo(() => {
        return allMovies
            .filter(m => m.trailer && m.key !== movie.key)
            .sort(() => Math.random() - 0.5);
    }, [allMovies, movie.key]);

    useEffect(() => {
        if (promotionMovies.length > 0) {
            const interval = setInterval(() => {
                setCurrentTrailerIdx(prev => (prev + 1) % promotionMovies.length);
            }, 20000); // Rotate trailers every 20 seconds
            return () => clearInterval(interval);
        }
    }, [promotionMovies]);

    const startLobbyAudio = () => {
        if (lobbyAudioRef.current && !audioStarted) {
            lobbyAudioRef.current.play().catch(e => console.log("Audio waiting for user interaction"));
            setAudioStarted(true);
        }
    };

    return (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden animate-[fadeIn_0.5s_ease-out]" onClick={startLobbyAudio}>
            {/* Background Trailer Loop */}
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
                    <img src={movie.poster} className="w-full h-full object-cover blur-2xl" alt="" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>
            </div>

            {/* Lobby UI */}
            <div className="relative z-10 text-center space-y-12 max-w-4xl px-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-6 py-2 rounded-full shadow-2xl mb-6">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Pre-Show Lobby // Global Sync Active</p>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">Uplink Imminent</p>
                        <h2 className="text-5xl md:text-[8rem] font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                            {movie.title}
                        </h2>
                    </div>
                </div>

                <div className="bg-black/60 backdrop-blur-xl px-12 py-8 rounded-[3rem] border border-white/10 inline-flex flex-col items-center gap-6 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.3em]">Feature Starts In</p>
                        <div className="w-px h-6 bg-white/10"></div>
                        <Countdown targetDate={movie.watchPartyStartTime!} className="text-4xl md:text-6xl font-black text-white font-mono tracking-tighter" prefix="" />
                    </div>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest animate-pulse">Establishing canonical time-code synchronization...</p>
                </div>

                <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Audio Status', val: audioStarted ? 'Synced' : 'Ready (Click to Enable)', color: audioStarted ? 'text-green-500' : 'text-amber-500' },
                        { label: 'Room Latency', val: '< 14ms', color: 'text-red-500' },
                        { label: 'Nodes Connected', val: 'Active', color: 'text-blue-500' }
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-xs font-bold uppercase tracking-tight ${stat.color}`}>{stat.val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invisible Audio Loop */}
            <audio 
                ref={lobbyAudioRef} 
                src="https://cratetelevision.s3.us-east-1.amazonaws.com/ambient-lobby-loop.mp3" 
                loop 
            />

            {/* Security Overlays */}
            <div className="absolute top-10 left-10 opacity-10">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-32 invert" alt="" />
            </div>
        </div>
    );
};

const LiveTalkbackTerminal: React.FC<{ 
    movie: Movie; 
    isSpeaker: boolean; 
    userName: string; 
    backstageKeyMatch?: string;
    onManualSpeakerUnlock: (key: string) => void;
    showKeyInputInitially?: boolean;
}> = ({ movie, isSpeaker, userName, backstageKeyMatch, onManualSpeakerUnlock, showKeyInputInitially = false }) => {
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
                                className="block mx-auto text-xs font-black uppercase text-red-500 hover:text-white tracking-widest transition-colors py-4 px-8 rounded-2xl border border-red-500/20 bg-red-600/5 shadow-xl"
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

const EmbeddedChat: React.FC<{ movieKey: string; movie: Movie; user: { name?: string; email: string | null; avatar?: string; } | null }> = ({ movieKey, movie, user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const directorsList = useMemo(() => 
        (movie.director || '').toLowerCase().split(',').map(d => d.trim()), 
    [movie.director]);

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
                    messages.map(msg => {
                        const isDirector = directorsList.includes(msg.userName.toLowerCase().trim());
                        return (
                            <div key={msg.id} className={`flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] ${isDirector ? 'bg-red-600/5 p-3 rounded-2xl border border-red-500/10' : ''}`}>
                                {/* FIX: Wrapped 'border-red-500 bg-red-600/20' in quotes to fix "Cannot find name" errors */}
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 p-1 border ${isDirector ? 'border-red-500 bg-red-600/20' : 'border-white/5 bg-gray-800'}`} dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-black text-[11px] uppercase tracking-tighter ${isDirector ? 'text-white' : 'text-red-500'}`}>{msg.userName}</p>
                                        {isDirector && (
                                            <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">Verified Director</span>
                                        )}
                                    </div>
                                    <p className={`text-sm break-words leading-snug ${isDirector ? 'text-white font-medium' : 'text-gray-200'}`}>{msg.text}</p>
                                </div>
                            </div>
                        );
                    })
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
    const [manualSpeakerKey, setManualSpeakerKey] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showBackstageVerification, setShowBackstageVerification] = useState(false);
    
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);

    const hasAccess = useMemo(() => {
        if (!movie?.isWatchPartyPaid) return true;
        return unlockedWatchPartyKeys.has(movieKey);
    }, [movie, unlockedWatchPartyKeys, movieKey]);

    const embedUrl = useMemo(() => movie ? getEmbedUrl(movie.fullMovie) : null, [movie]);

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

    // STRICT GLOBAL SYNC LOGIC
    useEffect(() => {
        if (!hasAccess || embedUrl || partyState?.isQALive) return;
        const video = videoRef.current;
        if (!video || !partyState?.actualStartTime) return;

        const syncClock = setInterval(() => {
            const serverStart = partyState.actualStartTime.toDate ? partyState.actualStartTime.toDate().getTime() : new Date(partyState.actualStartTime).getTime();
            const elapsed = (Date.now() - serverStart) / 1000;
            
            if (elapsed > 0) {
                // Feature duration logic
                const duration = (movie.durationInMinutes || 90) * 60;
                
                // If the movie is over, ensure the state transitions to 'ended'
                if (elapsed > duration && partyState.status !== 'ended') {
                    // This is usually handled by the server, but client-side cleanup:
                    video.pause();
                }

                if (Math.abs(video.currentTime - elapsed) > 2) {
                    video.currentTime = elapsed;
                }
                
                if (video.paused && !partyState.isQALive && elapsed < duration) {
                    video.play().catch(() => {});
                }
            }
        }, 1000);

        return () => clearInterval(syncClock);
    }, [partyState, hasAccess, embedUrl, movie?.durationInMinutes]);

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

    const handleTicketSuccess = async () => {
        await unlockWatchParty(movieKey);
        setShowPaywall(false);
    };

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    const isWaiting = startTime && new Date() < startTime;
    const isFinished = partyState?.status === 'ended';

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
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${partyState?.status === 'live' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-red-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${partyState?.status === 'live' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-red-600'}`}></span>
                                </span>
                                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">LIVE SCREENING</p>
                            </div>
                            <h2 className="text-xs font-bold truncate text-gray-200">{movie.title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isSpeakerCandidate && (
                                <button 
                                    onClick={() => setShowBackstageVerification(!showBackstageVerification)}
                                    className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${showBackstageVerification ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                >
                                    Backstage Access
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow w-full bg-black relative shadow-2xl z-30 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction 
                                    key={r.id} 
                                    emoji={r.emoji} 
                                    onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} 
                                />
                            ))}
                        </div>

                        {/* Automated Pre-Show Lobby with Trailer Reel */}
                        {isWaiting && partyState?.status !== 'live' && (
                             <PreShowLobby movie={movie} allMovies={Object.values(allMovies)} />
                        )}

                        {/* Thank You View */}
                        {isFinished && (
                            <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="max-w-2xl space-y-12">
                                    <div className="w-24 h-24 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                                        <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-5xl md:text-[6rem] font-black uppercase tracking-tighter italic leading-none">Transmission End.</h2>
                                        <p className="text-gray-400 text-xl font-medium max-w-lg mx-auto leading-relaxed">
                                            Thank you for being part of this live screening. We hope you enjoyed the work of <strong className="text-white font-black">{movie.director}</strong>.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                                        <button 
                                            onClick={handleGoHome}
                                            className="bg-white text-black font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Return to Catalog
                                        </button>
                                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Session terminated safely.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {partyState?.isQALive ? (
                            <LiveTalkbackTerminal 
                                movie={movie} 
                                isSpeaker={isSpeakerCandidate} 
                                userName={user?.name || "Guest Creator"}
                                backstageKeyMatch={partyState.backstageKey}
                                onManualSpeakerUnlock={setManualSpeakerKey}
                                showKeyInputInitially={showBackstageVerification}
                            />
                        ) : (
                            <div className="flex-grow flex items-center justify-center">
                                <video ref={videoRef} src={movie.fullMovie} className={`w-full h-full object-contain`} playsInline autoPlay muted={false} />
                            </div>
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
                        <EmbeddedChat movieKey={movieKey} movie={movie} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat movieKey={movieKey} movie={movie} user={user} />
                </div>
            </div>
        </div>
    );
};
