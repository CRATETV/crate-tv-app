
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
    startTime: string;
}> = ({ movie, block, startTime }) => {
    const title = block ? block.title : (movie ? movie.title : 'Loading Session...');
    const backdrop = movie?.poster || 'https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg';

    return (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            <div className="absolute inset-0">
                <img src={backdrop} className="w-full h-full object-cover blur-[100px] opacity-30 scale-110" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black"></div>
            </div>

            <div className="relative z-10 text-center space-y-12 max-w-4xl px-8 flex flex-col items-center">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-6 py-2 rounded-full shadow-2xl mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Transmission Pending // Secure Node</p>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">Uplink Scheduled For</p>
                        <h2 className="text-5xl md:text-[6rem] font-black uppercase tracking-tighter italic leading-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                            {title}
                        </h2>
                    </div>
                </div>

                <div className="bg-black/60 backdrop-blur-3xl px-16 py-12 rounded-[4rem] border border-white/10 flex flex-col items-center gap-6 shadow-2xl">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Synchronizing Uplink In</p>
                    <div className="h-px w-24 bg-white/10"></div>
                    <Countdown targetDate={startTime} className="text-6xl md:text-[7rem] font-black text-white font-mono tracking-tighter" prefix="" />
                </div>
                
                <p className="text-[10px] text-gray-600 uppercase font-black tracking-[1em] pt-12 animate-pulse">Establishing Canonical Clock Sync</p>
            </div>
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
    const [isHardwareMuted, setIsHardwareMuted] = useState(false);
    const [isVideoActuallyPlaying, setIsVideoActuallyPlaying] = useState(false);
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

    const handleManualSyncHandshake = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1.0;
            setIsHardwareMuted(false);
            videoRef.current.play().catch(() => {});
        }
    };

    useEffect(() => {
        if (!hasAccess || !partyState?.actualStartTime || partyState.status !== 'live') return;
        
        const video = videoRef.current;
        if (video && video.muted) {
            setIsHardwareMuted(true);
        }

        const syncClock = setInterval(() => {
            if (!video) return;

            const serverStart = partyState.actualStartTime.toDate ? partyState.actualStartTime.toDate().getTime() : new Date(partyState.actualStartTime).getTime();
            const elapsedTotalSeconds = (Date.now() - serverStart) / 1000;
            const targetTime = Math.max(0, elapsedTotalSeconds);

            const applyGlobalSync = (time: number) => {
                if (!video.src) return;

                if (Math.abs(video.currentTime - time) > 1.5 && !video.seeking) {
                    video.currentTime = time;
                }
                
                if (video.paused && !video.seeking) {
                    video.play().catch((error) => {
                        if (error.name === 'NotAllowedError') {
                            video.muted = true;
                            setIsHardwareMuted(true);
                            video.play();
                        }
                    });
                }
                
                if (video.currentTime > 0.1 && !isVideoActuallyPlaying) {
                    setIsVideoActuallyPlaying(true);
                }
                
                if (video.muted && !isWaiting) {
                    setIsHardwareMuted(true);
                }
            };

            if (context?.type === 'movie') {
                if (context.movie.isLiveStream) {
                    setIsVideoActuallyPlaying(true);
                } else {
                    applyGlobalSync(targetTime);
                }
                if (activeMovieKey !== movieKey) setActiveMovieKey(movieKey);
            } 
            else if (context?.type === 'block') {
                let accumulatedTime = 0;
                for (const key of context.block.movieKeys) {
                    const m = allMovies[key];
                    if (!m) continue;
                    const duration = (m.durationInMinutes || 10) * 60;
                    
                    if (targetTime >= accumulatedTime && targetTime < accumulatedTime + duration) {
                        const movieElapsed = targetTime - accumulatedTime;
                        if (activeMovieKey !== key) {
                            setActiveMovieKey(key);
                            setIsVideoActuallyPlaying(false);
                        }
                        applyGlobalSync(movieElapsed);
                        break;
                    }
                    accumulatedTime += duration;
                }
            }
        }, 1000); 
        return () => clearInterval(syncClock);
    }, [partyState, hasAccess, context, activeMovieKey, allMovies, movieKey, isVideoActuallyPlaying]);

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

    if (isFestivalLoading || !context) return <LoadingSpinner />;

    const startTimeStr = context.type === 'movie' ? context.movie.watchPartyStartTime : context.block.watchPartyStartTime;
    const isLive = partyState?.status === 'live';
    const isWaiting = (startTimeStr && !isLive && !isFestivalLoading) || (isLive && !isVideoActuallyPlaying);

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
                        <button onClick={() => setShowPaywall(true)} className="bg-white text-black font-black px-12 py-6 rounded-[2rem] uppercase tracking-tighter text-xl md:text-2xl shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all">
                            Authorize Entry // ${price?.toFixed(2)}
                        </button>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowBackstageModal(true)} className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 hover:text-white transition-colors">Director Entry</button>
                            <div className="w-px h-3 bg-white/10"></div>
                            <button handleGoHome={handleGoHome} className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors">Return to Library</button>
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
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-center text-5xl tracking-[0.5em] font-black text-white focus:border-red-600 outline-none"
                                placeholder="------"
                                required
                            />
                            <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl active:scale-95">Open Secure Link</button>
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
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden" onClick={() => { if(isHardwareMuted) handleManualSyncHandshake(); }}>
            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full min-h-0">
                <div className="flex-grow flex flex-col relative h-full min-h-0">
                    <div className="flex-none bg-black/90 p-3 flex items-center justify-between border-b border-white/5">
                        <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">{isLiveStream ? 'LIVE BROADCAST' : 'LIVE SESSION'}</p>
                            <h2 className="text-xs font-bold truncate text-gray-200">{context.type === 'movie' ? context.movie.title : context.block.title}</h2>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowBackstageModal(true); }}
                            className={`text-[9px] font-black uppercase border border-white/20 px-3 py-1 rounded-full transition-all ${isBackstageDirector ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {isBackstageDirector ? 'Backstage Access' : 'Director entry'}
                        </button>
                    </div>

                    <div className="flex-grow w-full bg-black relative z-30 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 z-[150] pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {isHardwareMuted && (
                            <div className="absolute top-4 left-4 z-[200] animate-[fadeIn_0.5s_ease-out] pointer-events-none">
                                <div className="bg-red-600/20 backdrop-blur-xl border border-red-500/40 px-4 py-1.5 rounded-full flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Audio Muted // Tap Screen to Sync</p>
                                </div>
                            </div>
                        )}

                        {isWaiting && (
                             <PreShowLobby movie={context.type === 'movie' ? context.movie : undefined} block={context.type === 'block' ? context.block : undefined} startTime={startTimeStr!} />
                        )}

                        {partyState?.status === 'ended' && (
                            <div className="absolute inset-0 z-[110] bg-black flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.5s_ease-out] pt-20">
                                <div className="space-y-12 max-w-xl">
                                    <h2 className="text-5xl md:text-[5.5rem] font-black uppercase tracking-tighter italic leading-[0.85] text-white">Transmission Complete.</h2>
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

                        <div className="flex-grow flex items-center justify-center relative">
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
                                    onPlaying={() => setIsVideoActuallyPlaying(true)}
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

            {showBackstageModal && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl" onClick={() => setShowBackstageModal(false)}>
                    <form onSubmit={handleBackstageAuth} className="bg-gray-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center space-y-8" onClick={e => e.stopPropagation()}>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Backstage Authorization</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-2">Enter unique session key provided by admin</p>
                        </div>
                        <input 
                            type="text" 
                            value={backstageCode} 
                            onChange={e => setBackstageCode(e.target.value.toUpperCase())} 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-center text-5xl tracking-[0.5em] font-black text-white focus:border-red-600 outline-none"
                            placeholder="------"
                            required
                        />
                        <button type="submit" className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl active:scale-95">Open Secure Link</button>
                    </form>
                </div>
            )}
        </div>
    );
};
