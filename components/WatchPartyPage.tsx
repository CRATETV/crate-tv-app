
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage, SentimentPoint, FilmBlock } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import SquarePaymentModal from './SquarePaymentModal';
import Countdown from './Countdown';
import SearchOverlay from './SearchOverlay';

interface WatchPartyPageProps {
  movieKey: string;
}

const REACTION_TYPES = ['🔥', '😲', '❤️', '👏', '😢'] as const;

const FloatingReaction: React.FC<{ emoji: string; onComplete: () => void }> = ({ emoji, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 80) + 10, []); 
    const randomDuration = useMemo(() => 2.0 + Math.random() * 1.5, []); 
    const randomScale = useMemo(() => 0.8 + Math.random() * 1.2, []); 
    const randomRotate = useMemo(() => Math.floor(Math.random() * 60) - 30, []);

    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);

    return (
        <div 
            className="absolute bottom-10 pointer-events-none text-6xl animate-emoji-float z-[100] select-none"
            style={{ 
                left: `${randomLeft}%`, 
                animationDuration: `${randomDuration}s`,
                transform: `scale(${randomScale}) rotate(${randomRotate}deg)`,
                textShadow: '0 0 20px rgba(0,0,0,0.5)'
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

    const title = block ? block.title : (movie ? movie.title : 'Loading Session...');
    return (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center overflow-hidden animate-[fadeIn_0.5s_ease-out]">
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
                    <div className="w-full h-full bg-gray-900 animate-pulse"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"></div>
            </div>

            <div className="relative z-10 text-center space-y-12 max-w-4xl px-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-6 py-2 rounded-full shadow-2xl mb-6">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Pre-Show Lobby // Global Sync Active</p>
                    </div>
                    <h2 className="text-5xl md:text-[6rem] font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                        {title}
                    </h2>
                </div>

                <div className="bg-black/60 backdrop-blur-xl px-12 py-8 rounded-[3rem] border border-white/10 inline-flex flex-col items-center gap-6 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.3em]">Session Starts In</p>
                        <div className="w-px h-6 bg-white/10"></div>
                        <Countdown targetDate={startTime} className="text-4xl md:text-6xl font-black text-white font-mono tracking-tighter" prefix="" />
                    </div>
                </div>
            </div>
            <audio src="https://cratetelevision.s3.us-east-1.amazonaws.com/ambient-lobby-loop.mp3" loop autoPlay />
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
    const { user, unlockedWatchPartyKeys, unlockWatchParty, unlockedFestivalBlockIds } = useAuth();
    const { movies: allMovies, festivalData, isLoading: isFestivalLoading } = useFestival();
    
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [activeMovieKey, setActiveMovieKey] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerWrapperRef = useRef<HTMLDivElement>(null);

    const context = useMemo(() => {
        const movie = allMovies[movieKey];
        if (movie) return { type: 'movie' as const, movie };
        const allBlocks = festivalData.flatMap(d => d.blocks);
        const block = allBlocks.find(b => b.id === movieKey);
        if (block) return { type: 'block' as const, block };
        return null;
    }, [movieKey, allMovies, festivalData]);

    const searchResults = useMemo(() => {
        if (!localSearchQuery) return [];
        const query = localSearchQuery.toLowerCase().trim();
        return (Object.values(allMovies) as Movie[]).filter(movie =>
            movie && movie.poster && movie.title && !movie.isUnlisted &&
            (movie.title.toLowerCase().includes(query) || movie.director.toLowerCase().includes(query))
        );
    }, [localSearchQuery, allMovies]);

    const hasAccess = useMemo(() => {
        if (context?.type === 'movie') {
            if (!context.movie.isWatchPartyPaid) return true;
            return unlockedWatchPartyKeys.has(movieKey);
        } else if (context?.type === 'block') {
            return unlockedFestivalBlockIds.has(movieKey);
        }
        return false;
    }, [context, movieKey, unlockedWatchPartyKeys, unlockedFestivalBlockIds]);

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
        
        // WATCH PARTY STATE LISTENER
        const unsubscribe = partyRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data() as WatchPartyState;
                setPartyState(data);
                if (data.status === 'live' && context?.type === 'movie' && !activeMovieKey) {
                    setActiveMovieKey(movieKey);
                }
            }
        });

        // GLOBAL EMOJI LISTENER (Fix: Reliance on added changes for everyone)
        const tenSecondsAgo = new Date(Date.now() - 10000);
        const reactionsRef = partyRef.collection('live_reactions')
            .where('timestamp', '>=', tenSecondsAgo)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    // Trigger animation for all 'added' reactions from the database
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: data.emoji }]);
                    }
                });
            });

        return () => { unsubscribe(); reactionsRef(); };
    }, [movieKey, context?.type, activeMovieKey]);

    useEffect(() => {
        if (!hasAccess || !partyState?.actualStartTime || partyState.status !== 'live') return;
        
        const syncClock = setInterval(() => {
            const serverStart = partyState.actualStartTime.toDate ? partyState.actualStartTime.toDate().getTime() : new Date(partyState.actualStartTime).getTime();
            const elapsedTotalSeconds = (Date.now() - serverStart) / 1000;
            
            if (elapsedTotalSeconds < 0) return; 

            if (context?.type === 'movie') {
                const video = videoRef.current;
                if (video) {
                    if (Math.abs(video.currentTime - elapsedTotalSeconds) > 10) {
                        video.currentTime = elapsedTotalSeconds;
                    }
                    if (video.paused) video.play().catch(() => {});
                    if (activeMovieKey !== movieKey) setActiveMovieKey(movieKey);
                }
            } else if (context?.type === 'block') {
                let accumulatedTime = 0;
                for (const key of context.block.movieKeys) {
                    const m = allMovies[key];
                    if (!m) continue;
                    const duration = (m.durationInMinutes || 10) * 60;
                    if (elapsedTotalSeconds >= accumulatedTime && elapsedTotalSeconds < accumulatedTime + duration) {
                        const movieElapsed = elapsedTotalSeconds - accumulatedTime;
                        if (activeMovieKey !== key) setActiveMovieKey(key);
                        const video = videoRef.current;
                        if (video) {
                            if (Math.abs(video.currentTime - movieElapsed) > 10) {
                                video.currentTime = movieElapsed;
                            }
                            if (video.paused) video.play().catch(() => {});
                        }
                        return;
                    }
                    accumulatedTime += duration;
                }
            }
        }, 3000); 
        return () => clearInterval(syncClock);
    }, [partyState, hasAccess, context, activeMovieKey, allMovies, movieKey]);

    const logSentiment = async (emoji: string) => {
        // Optimistic local UI trigger is removed in favor of purely synced DB trigger
        // to ensure that if the sender sees it, they know the transmission was successful.
        const db = getDbInstance();
        if (db) {
            db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({
                emoji, 
                userId: user?.uid || 'guest', 
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
    const isWaiting = startTimeStr && new Date() < new Date(startTimeStr) && partyState?.status !== 'live';
    const isFinished = partyState?.status === 'ended';

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-4xl font-black text-white uppercase italic">Entry Ticket Required</h2>
                <button onClick={() => setShowPaywall(true)} className="bg-white text-black font-black py-5 px-12 rounded-2xl uppercase text-xs mt-8">Get Event Ticket</button>
                {showPaywall && <SquarePaymentModal movie={context.type === 'movie' ? context.movie : undefined} paymentType={context.type === 'movie' ? "watchPartyTicket" : "block"} onClose={() => setShowPaywall(false)} onPaymentSuccess={() => { if (context.type === 'movie') unlockWatchParty(movieKey); setShowPaywall(false); }} />}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden">
            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full min-h-0">
                <div className="flex-grow flex flex-col relative h-full min-h-0">
                    <div className="flex-none bg-black/90 p-3 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors" title="Home"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                            <button onClick={() => setIsSearchOpen(true)} className="text-gray-400 hover:text-red-500 transition-colors" title="Browse catalog">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">LIVE SESSION</p>
                            <h2 className="text-xs font-bold truncate text-gray-200">{context.type === 'movie' ? context.movie.title : context.block.title}</h2>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    <div ref={playerWrapperRef} className="flex-grow w-full bg-black relative z-30 overflow-hidden flex flex-col">
                        {/* EMOJI LAYER - High Z-Index, inside player container for Fullscreen support */}
                        <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {isWaiting && (
                             <PreShowLobby movie={context.type === 'movie' ? context.movie : undefined} block={context.type === 'block' ? context.block : undefined} allMovies={Object.values(allMovies)} startTime={startTimeStr!} />
                        )}

                        {isFinished && (
                            <div className="absolute inset-0 z-[110] bg-black flex flex-col items-center justify-center p-8 text-center">
                                <h2 className="text-5xl font-black uppercase tracking-tighter italic mb-8">Transmission End.</h2>
                                <button onClick={handleGoHome} className="bg-white text-black font-black px-12 py-4 rounded-2xl text-xs uppercase">Return to Catalog</button>
                            </div>
                        )}

                        <div className="flex-grow flex items-center justify-center">
                            {activeMovieKey ? (
                                <video ref={videoRef} src={allMovies[activeMovieKey]?.fullMovie} className="w-full h-full object-contain" playsInline autoPlay />
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
                        <EmbeddedChat partyKey={movieKey} directors={directorsList} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat partyKey={movieKey} directors={directorsList} user={user} />
                </div>
            </div>

            {isSearchOpen && (
                <SearchOverlay 
                    searchQuery={localSearchQuery} 
                    onSearch={setLocalSearchQuery} 
                    onClose={() => setIsSearchOpen(false)} 
                    results={searchResults} 
                    onSelectMovie={(m) => { setIsSearchOpen(false); window.location.href = `/movie/${m.key}?play=true`; }} 
                />
            )}
        </div>
    );
};
