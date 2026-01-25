import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
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

/**
 * STRATEGIC EMBED ENGINE V4.5
 * Injects global start-time offsets into 3rd party players for synchronized events.
 */
const processLiveEmbed = (input: string, startTimeOffset: number = 0): string => {
    const trimmed = input.trim();
    const startSec = Math.max(0, Math.floor(startTimeOffset));

    // If it's already a raw iframe, we can only pass the string back.
    if (trimmed.startsWith('<iframe')) return trimmed;

    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = trimmed.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        // YouTube uses '&start=X' for offsets
        return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0${startSec > 0 ? `&start=${startSec}` : ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = trimmed.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        // Vimeo uses '#t=Xs' for offsets
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ef4444&title=0&byline=0&portrait=0${startSec > 0 ? `#t=${startSec}s` : ''}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    }

    return `<div class="flex items-center justify-center h-full text-gray-500 font-mono text-xs uppercase p-10 text-center">Invalid Relay Node: ${trimmed}</div>`;
};

const FloatingReaction: React.FC<{ emoji: string; onComplete: () => void }> = ({ emoji, onComplete }) => {
    const randomLeft = useMemo(() => Math.floor(Math.random() * 80) + 10, []); 
    const randomDuration = useMemo(() => 3.5 + Math.random() * 1.5, []); 

    useEffect(() => {
        const timer = setTimeout(onComplete, randomDuration * 1000);
        return () => clearTimeout(timer);
    }, [randomDuration, onComplete]);

    return (
        <div 
            className="absolute bottom-24 pointer-events-none z-[120] animate-emoji-float text-6xl drop-shadow-2xl"
            style={{ left: `${randomLeft}%`, animationDuration: `${randomDuration}s` }}
        >
            {emoji}
        </div>
    );
};

const EmbeddedChat: React.FC<{ 
    partyKey: string; 
    directors: string[];
    isQALive?: boolean;
    user: { name?: string; email: string | null; avatar?: string; } | null 
}> = ({ partyKey, directors, isQALive, user }) => {
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
                    text: newMessage
                }),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Chat send error:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0a0a] md:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-hidden min-h-0">
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 p-1 border border-white/5 bg-gray-800" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div className="min-w-0">
                            <p className="font-black text-[11px] uppercase tracking-tighter text-red-500">{msg.userName}</p>
                            <p className="text-sm break-words leading-snug text-gray-300">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur-xl border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-full px-4 py-1 border border-white/10">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-2.5" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500" disabled={!user || isSending || !newMessage.trim()}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
};

export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, unlockedWatchPartyKeys, unlockWatchParty, rentals } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading } = useFestival();
    
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [localReactions, setLocalReactions] = useState<{ id: string; emoji: string }[]>([]);
    const [showPaywall, setShowPaywall] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const movie = useMemo(() => allMovies[movieKey], [movieKey, allMovies]);

    // Calculate time offset since actualStartTime
    const currentOffset = useMemo(() => {
        if (!partyState?.actualStartTime) return 0;
        try {
            const serverStart = (partyState.actualStartTime as any).toDate().getTime();
            const now = Date.now();
            return (now - serverStart) / 1000;
        } catch (e) { return 0; }
    }, [partyState?.actualStartTime]);

    // FRAME-ACCURATE SYNC LOGIC (FOR NATIVE VIDEO)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !partyState?.actualStartTime || movie?.isLiveStream) return;

        const syncClock = () => {
            const targetPosition = currentOffset;

            // If the movie should have ended, stop it.
            const movieDuration = movie?.durationInMinutes ? movie.durationInMinutes * 60 : 3600;
            if (targetPosition > movieDuration) {
                video.pause();
                return;
            }

            // High precision drift correction (threshold: 2 seconds)
            // Hard realignment ensures all global viewers are within the same 2-second window
            if (Math.abs(video.currentTime - targetPosition) > 2) {
                video.currentTime = targetPosition;
            }

            // Ensure play state parity across cluster
            if (partyState.isPlaying && video.paused) video.play().catch(() => {});
            else if (!partyState.isPlaying && !video.paused) video.pause();
        };

        const interval = setInterval(syncClock, 3000); 
        syncClock(); 

        return () => clearInterval(interval);
    }, [partyState, movie, currentOffset]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const partyRef = db.collection('watch_parties').doc(movieKey);
        const unsubscribe = partyRef.onSnapshot(doc => { if (doc.exists) setPartyState(doc.data() as WatchPartyState); });
        const reactionsRef = partyRef.collection('live_reactions').where('timestamp', '>=', new Date(Date.now() - 5000))
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') setLocalReactions(prev => [...prev, { id: change.doc.id, emoji: change.doc.data().emoji }]);
                });
            });
        return () => { unsubscribe(); reactionsRef(); };
    }, [movieKey]);

    const hasAccess = useMemo(() => {
        if (!movie) return false;
        if (unlockedWatchPartyKeys.has(movieKey)) return true;
        if (!movie.isWatchPartyPaid) return true;
        const exp = rentals[movieKey];
        return exp && new Date(exp) > new Date();
    }, [movie, rentals, movieKey, unlockedWatchPartyKeys]);

    const logSentiment = async (emoji: string) => {
        const db = getDbInstance();
        if (db) db.collection('watch_parties').doc(movieKey).collection('live_reactions').add({ emoji, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    };

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden">
            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full">
                <div className="flex-grow flex flex-col relative h-full">
                    <div className="p-3 bg-black/90 flex items-center justify-between border-b border-white/5">
                        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="text-center">
                            <span className="text-red-500 font-black text-[9px] uppercase tracking-widest animate-pulse">Live Transmission Active</span>
                            <h2 className="text-sm font-bold truncate max-w-[200px] md:max-w-none">{movie.title}</h2>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-grow bg-[#050505] relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-[150] pointer-events-none">
                            {localReactions.map(r => (
                                <FloatingReaction key={r.id} emoji={r.emoji} onComplete={() => setLocalReactions(prev => prev.filter(item => item.id !== r.id))} />
                            ))}
                        </div>

                        {!hasAccess ? (
                             <div className="text-center p-8 space-y-10 animate-[fadeIn_0.8s_ease-out]">
                                <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none">Admission Required.</h2>
                                <button onClick={() => setShowPaywall(true)} className="bg-white text-black px-16 py-6 rounded-[2.5rem] font-black uppercase tracking-tighter text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all">Unlock Admission // ${movie.watchPartyPrice?.toFixed(2)}</button>
                             </div>
                        ) : (
                            movie.isLiveStream ? (
                                <div className="w-full h-full p-2 md:p-6 lg:p-12 flex items-center justify-center bg-black">
                                    <div className="w-full h-full bg-gray-900 rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl border border-white/5 relative" dangerouslySetInnerHTML={{ __html: processLiveEmbed(movie.liveStreamEmbed!, currentOffset) }} />
                                </div>
                            ) : (
                                <video ref={videoRef} src={movie.fullMovie} className="w-full h-full object-contain" autoPlay muted />
                            )
                        )}
                    </div>

                    <div className="p-4 bg-black/40 border-y border-white/5 flex justify-center gap-6 md:gap-12 backdrop-blur-xl">
                        {REACTION_TYPES.map(emoji => (
                            <button key={emoji} onClick={() => logSentiment(emoji)} className="text-4xl md:text-5xl hover:scale-150 active:scale-90 transition-transform drop-shadow-lg">{emoji}</button>
                        ))}
                    </div>

                    <div className="md:hidden h-80 flex flex-col overflow-hidden bg-[#0a0a0a]">
                        <EmbeddedChat partyKey={movieKey} directors={[]} isQALive={partyState?.isQALive} user={user} />
                    </div>
                </div>

                <div className="hidden md:flex w-96 flex-shrink-0 h-full border-l border-white/5">
                    <EmbeddedChat partyKey={movieKey} directors={[]} isQALive={partyState?.isQALive} user={user} />
                </div>
            </div>

            {showPaywall && (
                <SquarePaymentModal 
                    movie={movie} 
                    paymentType="watchPartyTicket" 
                    onClose={() => setShowPaywall(false)} 
                    onPaymentSuccess={() => { unlockWatchParty(movieKey); setShowPaywall(false); }} 
                />
            )}
        </div>
    );
};