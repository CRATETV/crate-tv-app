
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage, FilmBlock } from '../types';
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

const FloatingReaction: React.FC<{ emoji: string; onComplete: () => void }> = ({ emoji, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 80) + 10, []); 
    const randomDuration = useMemo(() => 3.5 + Math.random() * 1.5, []); 
    const randomRotate = useMemo(() => Math.floor(Math.random() * 40) - 20, []);

    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);

    return (
        <div 
            className="absolute bottom-24 pointer-events-none z-[120] animate-emoji-float"
            style={{ 
                left: `${randomLeft}%`, 
                animationDuration: `${randomDuration}s`
            }}
        >
            <div 
                className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                style={{ 
                    transform: `rotate(${randomRotate}deg)`
                }}
            >
                {emoji}
            </div>
        </div>
    );
};

const DirectorStage: React.FC<{ name: string }> = ({ name }) => (
    <div className="bg-red-600 border-2 border-red-400 p-5 rounded-2xl flex items-center justify-between mb-6 shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-[slideInDown_0.5s_ease-out]">
        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-gray-900 shadow-2xl">
                    <div className="w-full h-full p-2" dangerouslySetInnerHTML={{ __html: avatars['fox'] }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-red-600 animate-pulse"></div>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-red-100 tracking-[0.3em] leading-none">STAGE_ACTIVE // TALKBACK LIVE</p>
                <h4 className="text-lg font-black text-white uppercase tracking-tight mt-1">{name} is on the stage</h4>
            </div>
        </div>
        <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/10">
             <p className="text-[9px] font-black text-white uppercase tracking-widest animate-pulse">Ask a Question</p>
        </div>
    </div>
);

const PreShowLobby: React.FC<{ 
    movie?: Movie; 
    block?: FilmBlock; 
    allMovies: Movie[]; 
    startTime: string;
}> = ({ movie, block, allMovies, startTime }) => {
    const [cycleIndex, setCycleIndex] = useState(0);

    // Filter catalog for cycling background (exclude the main attraction)
    const catalogCycle = useMemo(() => {
        return allMovies
            .filter(m => m.poster && m.title && (!movie || m.key !== movie.key))
            .sort(() => Math.random() - 0.5);
    }, [allMovies, movie]);

    useEffect(() => {
        if (catalogCycle.length > 0) {
            const interval = setInterval(() => {
                setCycleIndex(prev => (prev + 1) % catalogCycle.length);
            }, 12000); // Cycle every 12 seconds
            return () => clearInterval(interval);
        }
    }, [catalogCycle]);

    const targetTitle = block ? block.title : (movie ? movie.title : 'Loading Session...');
    const currentCycleFilm = catalogCycle[cycleIndex];

    return (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            {/* AMBIENT BACKGROUND CYCLE */}
            <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
                {currentCycleFilm && (
                    <div key={currentCycleFilm.key} className="absolute inset-0 animate-[fadeIn_1.5s_ease-out]">
                         <img 
                            src={currentCycleFilm.poster} 
                            className="w-full h-full object-cover blur-[80px] opacity-40 scale-110" 
                            alt="" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black"></div>
                        
                        {/* THEATER HIGHLIGHT CARD */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl px-8 flex flex-col md:flex-row items-center gap-12 pointer-events-none opacity-60 group">
                             <div className="w-48 md:w-64 aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 flex-shrink-0 transition-transform duration-700">
                                <img src={currentCycleFilm.poster} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div className="text-center md:text-left space-y-6 max-w-xl">
                                <div className="space-y-2">
                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px]">Crate Collection Spotlight</p>
                                    <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-tight">
                                        {currentCycleFilm.title}
                                    </h3>
                                </div>
                                <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed italic line-clamp-3">
                                    "{currentCycleFilm.synopsis.replace(/<[^>]+>/g, '')}"
                                </p>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PERSISTENT MAIN ATTRACTION OVERLAY */}
            <div className="relative z-50 w-full h-full flex flex-col items-center justify-between py-20 px-8">
                {/* ANCHORED WELCOME HEADER */}
                <div className="text-center space-y-4 animate-[slideInDown_1s_ease-out]">
                    <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-6 py-2 rounded-full shadow-2xl mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Live Session Queue // Secure Node</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-gray-500 font-black uppercase tracking-[0.8em] text-[10px]">Transmission Welcomes You To</p>
                        <h2 className="text-5xl md:text-[5rem] font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-[0_10px_50px_rgba(0,0,0,1)]">
                            {targetTitle}
                        </h2>
                    </div>
                </div>

                {/* HEARTBEAT COUNTDOWN */}
                <div className="bg-black/60 backdrop-blur-3xl px-16 py-12 rounded-[4rem] border border-white/10 flex flex-col items-center gap-6 shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-[fadeIn_1.5s_ease-out]">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.5em]">Synchronizing Uplink In</p>
                    <div className="h-px w-32 bg-white/10"></div>
                    <Countdown targetDate={startTime} className="text-6xl md:text-[7rem] font-black text-white font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" prefix="" />
                </div>

                <div className="text-center space-y-2 opacity-40">
                     <p className="text-[10px] text-gray-500 uppercase font-black tracking-[1em] animate-pulse">Ambient Audio Transmitting</p>
                     <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">Crate TV Infrastructure V4.2</p>
                </div>
            </div>

            {/* Ambient Royalty-Free Loop */}
            <audio src="https://cratetelevision.s3.us-east-1.amazonaws.com/ambient-lobby-loop.mp3" loop autoPlay />
        </div>
    );
};

const EmbeddedChat: React.FC<{ 
    partyKey: string; 
    directors: string[];
    isQALive?: boolean;
    isBackstageDirector?: boolean;
    user: { name?: string; email: string | null; avatar?: string; } | null 
}> = ({ partyKey, directors, isQALive, isBackstageDirector, user }) => {
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
                body: JSON.stringify({ 
                    movieKey: partyKey, 
                    userName: user.name || user.email, 
                    userAvatar: user.avatar || 'fox', 
                    text: newMessage,
                    isVerifiedDirector: isBackstageDirector 
                }),
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
                {isQALive && directors.length > 0 && <DirectorStage name={directors[0]} />}
                
                {messages.map(msg => {
                    const isDirector = directors.includes(msg.userName.toLowerCase().trim()) || (msg as any).isVerifiedDirector;
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] ${isDirector ? 'bg-red-600/5 p-4 rounded-3xl border border-red-500/20 shadow-lg' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 p-1 border ${isDirector ? 'border-red-500 bg-red-600/20' : 'border-white/5 bg-gray-800'}`} dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`font-black text-[11px] uppercase tracking-tighter ${isDirector ? 'text-white' : 'text-red-500'}`}>{msg.userName}</p>
                                    {isDirector && <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-[0.2em] uppercase">Verified Creator</span>}
                                </div>
                                <p className={`text-sm break-words leading-snug ${isDirector ? 'text-white font-medium' : 'text-gray-300'}`}>{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-4 py-1 border border-white/10">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={isBackstageDirector ? "Speak as Director..." : "Type a message..."} className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500 hover:text-red-400 disabled:text-gray-600 transition-colors" disabled={!user || isSending || !newMessage.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty, unlockedFestivalBlockIds } = useAuth();
    const { movies: allMovies, festivalData, isLoading: isFestivalLoading } = useFestival();
    
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [activeMovieKey, setActiveMovieKey] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    const [isBackstageDirector, setIsBackstageDirector] = useState(false);
    const [showBackstageModal, setShowBackstageModal] = useState(false);
    const [backstageCode, setBackstageCode] = useState('');
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
    const [isVideoActive, setIsVideoActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const context = useMemo(() => {
        const movie = allMovies[movieKey];
        if (movie) return { type: 'movie' as const, movie };
        const allBlocks = festivalData.flatMap(d => d.blocks);
        const block = allBlocks.find(b => b.id === movieKey);
        if (block) return { type: 'block' as const, block };
        return null;
    }, [movieKey, allMovies, festivalData]);

    const hasAccess = useMemo(() => {
        if (isBackstageDirector) return true;
        if (context?.type === 'movie') {
            if (!context.movie.isWatchPartyPaid) return true;
            return unlockedWatchPartyKeys.has(movieKey);
        } else if (context?.type === 'block') {
            return unlockedFestivalBlockIds.has(movieKey);
        }
        return false;
    }, [context, movieKey, unlockedWatchPartyKeys, unlockedFestivalBlockIds, isBackstageDirector]);

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
            if (doc.exists) {
                const data = doc.data() as WatchPartyState;
                setPartyState(data);
                if (data.status === 'live' && context?.type === 'movie') {
                    setActiveMovieKey(movieKey);
                }
            }
        });
        const tenSecondsAgo = new Date(Date.now() - 10000);
        const reactionsRef = partyRef.collection('live_reactions')
            .where('timestamp', '>=', tenSecondsAgo)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: change.doc.data().emoji }]);
                    }
                });
            });
        return () => { unsubscribe(); reactionsRef(); };
    }, [movieKey, context?.type]);

    const handleBackstageAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (backstageCode.trim() === partyState?.backstageKey) {
            setIsBackstageDirector(true);
            setShowBackstageModal(false);
            alert("Uplink Secure. Welcome Backstage, Director.");
        } else {
            alert("Invalid Key. Session rejected.");
        }
    };

    useEffect(() => {
        if (!hasAccess || !partyState?.actualStartTime || partyState.status !== 'live') return;
        
        // Disable sync logic for Live Streams (Restream handles its own sync)
        if (context?.type === 'movie' && context.movie.isLiveStream) {
            setIsVideoActive(true);
            return;
        }

        const syncClock = setInterval(() => {
            const video = videoRef.current;
            if (!video || video.readyState < 2) return; // Wait for metadata/frame data

            const serverStart = partyState.actualStartTime.toDate ? partyState.actualStartTime.toDate().getTime() : new Date(partyState.actualStartTime).getTime();
            const elapsedTotalSeconds = (Date.now() - serverStart) / 1000;
            
            if (elapsedTotalSeconds < 0) return; 

            const applyGlobalSync = (targetTime: number) => {
                // Only seek if divergence is greater than 1.5s to avoid jitter
                if (Math.abs(video.currentTime - targetTime) > 1.5 && !video.seeking) {
                    video.currentTime = targetTime;
                }
                
                if (video.paused && !video.seeking) {
                    video.play().catch((error) => {
                        if (error.name === 'NotAllowedError' && !video.muted) {
                            video.muted = true;
                            setShowUnmutePrompt(true);
                            video.play().catch(e => console.error("Sync block", e));
                        }
                    });
                }
            };

            if (context?.type === 'movie') {
                applyGlobalSync(elapsedTotalSeconds);
                if (activeMovieKey !== movieKey) setActiveMovieKey(movieKey);
            } 
            else if (context?.type === 'block') {
                let accumulatedTime = 0;
                for (const key of context.block.movieKeys) {
                    const m = allMovies[key];
                    if (!m) continue;
                    const duration = (m.durationInMinutes || 10) * 60;
                    
                    if (elapsedTotalSeconds >= accumulatedTime && elapsedTotalSeconds < accumulatedTime + duration) {
                        const movieElapsed = elapsedTotalSeconds - accumulatedTime;
                        if (activeMovieKey !== key) {
                            setActiveMovieKey(key);
                            setIsVideoActive(false); // Reset visual state for new film in block
                        }
                        applyGlobalSync(movieElapsed);
                        break;
                    }
                    accumulatedTime += duration;
                }
            }
        }, 1000); 
        return () => clearInterval(syncClock);
    }, [partyState, hasAccess, context, activeMovieKey, allMovies, movieKey]);

    const logSentiment = async (emoji: string) => {
        const db = getDbInstance();
        if (db) {
            db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({
                emoji, userId: user?.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleManualUnmute = () => {
        if (videoRef.current) {
            videoRef.current.muted = false;
            setShowUnmutePrompt(false);
        }
    };

    if (isFestivalLoading || !context) return <LoadingSpinner />;

    const startTimeStr = context.type === 'movie' ? context.movie.watchPartyStartTime : context.block.watchPartyStartTime;
    const isLive = partyState?.status === 'live';
    // isWaiting now checks if the video is actually moving to prevent early lobby dismissal
    const isWaiting = (startTimeStr && !isLive && !isFestivalLoading) || (isLive && !isVideoActive);

    if (!hasAccess) {
        const poster = context.type === 'movie' ? context.movie.poster : '';
        const price = context.type === 'movie' ? context.movie.watchPartyPrice : 10.00;
        
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    <img src={poster} className="w-full h-full object-cover blur-3xl scale-110" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>
                </div>
                
                <div className="relative z-10 max-lg space-y-12 animate-[fadeIn_0.8s_ease-out]">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full shadow-2xl mb-4">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]"></span>
                            <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px]">Secure Live Node</p>
                        </div>
                        <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">Entry Ticket Required.</h2>
                        <p className="text-gray-400 text-lg md:text-xl font-medium max-w-md mx-auto">This screening is a ticketed community event. Your patronage directly supports the filmmaker.</p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <button onClick={() => setShowPaywall(true)} className="bg-white text-black font-black py-6 px-16 rounded-[2rem] uppercase tracking-tighter text-xl md:text-2xl shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all">
                            Authorize Entry // ${price?.toFixed(2)}
                        </button>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowBackstageModal(true)} className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 hover:text-white transition-colors">Director Entry</button>
                            <div className="w-px h-3 bg-white/10"></div>
                            <button onClick={handleGoHome} className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors">Return to Library</button>
                        </div>
                    </div>
                </div>

                {showBackstageModal && (
                    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl" onClick={() => setShowBackstageModal(false)}>
                        <form onSubmit={handleBackstageAuth} className="bg-gray-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center space-y-8" onClick={e => e.stopPropagation()}>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Backstage Authorization</h3>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-2">Enter unique session key provided by admin</p>
                            </div>
                            <input 
                                type="text" 
                                value={backstageCode} 
                                onChange={e => setBackstageCode(e.target.value.toUpperCase())} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-center text-4xl font-black tracking-[0.5em] text-white focus:border-red-600 outline-none"
                                placeholder="------"
                                required
                            />
                            <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95">Open Secure Link</button>
                        </form>
                    </div>
                )}

                {showPaywall && (
                    <SquarePaymentModal 
                        movie={context.type === 'movie' ? context.movie : undefined} 
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

    const isLiveStream = context.type === 'movie' && context.movie.isLiveStream;

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden" onClick={() => { if(showUnmutePrompt) handleManualUnmute(); }}>
            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full min-h-0">
                <div className="flex-grow flex flex-col relative h-full min-h-0">
                    <div className="flex-none bg-black/90 p-3 flex items-center justify-between border-b border-white/5">
                        <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">{isLiveStream ? 'LIVE BROADCAST' : 'LIVE SESSION'}</p>
                            <h2 className="text-xs font-bold truncate text-gray-200">{context.type === 'movie' ? context.movie.title : context.block.title}</h2>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-grow w-full bg-black relative z-30 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {showUnmutePrompt && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-bounce pointer-events-none">
                                <div className="bg-white text-black font-black px-8 py-4 rounded-2xl flex items-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.2)] uppercase tracking-widest text-sm">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4 4H5v6h3l4 4V5z" /></svg>
                                    Tap for Audio
                                </div>
                            </div>
                        )}

                        {isWaiting && (
                             <PreShowLobby movie={context.type === 'movie' ? context.movie : undefined} block={context.type === 'block' ? context.block : undefined} allMovies={Object.values(allMovies)} startTime={startTimeStr!} />
                        )}

                        {partyState?.status === 'ended' && (
                            <div className="absolute inset-0 z-[110] bg-black flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="space-y-6 max-w-xl">
                                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none text-white">Transmission Complete.</h2>
                                    <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed">
                                        Thank you for joining the Crate community. Your attendance directly fuels the next generation of independent filmmakers.
                                    </p>
                                    <div className="pt-8 flex flex-col items-center gap-4">
                                        <button onClick={handleGoHome} className="bg-white text-black font-black px-16 py-6 rounded-3xl text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">Return to Catalog</button>
                                        <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">The chat remains open for talkback</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow flex items-center justify-center">
                            {isLiveStream ? (
                                <div 
                                    className="w-full h-full p-4 md:p-8 flex items-center justify-center bg-black"
                                    dangerouslySetInnerHTML={{ __html: context.movie.liveStreamEmbed || '' }}
                                />
                            ) : activeMovieKey ? (
                                <video 
                                    ref={videoRef} 
                                    src={allMovies[activeMovieKey]?.fullMovie} 
                                    className="w-full h-full object-contain" 
                                    playsInline 
                                    autoPlay 
                                    muted 
                                    onPlaying={() => setIsVideoActive(true)}
                                />
                            ) : !isWaiting && (
                                <div className="text-center space-y-4 opacity-30">
                                    <p className="text-xs font-black uppercase tracking-[1em] mr-[-1em]">Establishing Uplink...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-none bg-black/40 border-b border-white/5 py-4 px-4 flex flex-col items-center gap-4 z-40">
                         <div className="flex justify-around w-full max-w-md">
                            {REACTION_TYPES.map(emoji => (
                                <button key={emoji} onClick={() => logSentiment(emoji)} className="text-2xl md:text-4xl hover:scale-150 transition-transform p-2">{emoji}</button>
                            ))}
                         </div>
                    </div>
                    
                    <div className="flex-grow flex flex-col md:hidden overflow-hidden bg-[#0a0a0a] min-h-0">
                        <EmbeddedChat partyKey={movieKey} directors={directorsList} isQALive={partyState?.isQALive} isBackstageDirector={isBackstageDirector} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat partyKey={movieKey} directors={directorsList} isQALive={partyState?.isQALive} isBackstageDirector={isBackstageDirector} user={user} />
                </div>
            </div>
        </div>
    );
};
