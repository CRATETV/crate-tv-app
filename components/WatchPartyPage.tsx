import React, { useState, useRef, useEffect, useMemo } from 'react';
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

const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Vimeo Detection
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&color=ff0000&title=0&byline=0&portrait=0`;
    }
    const vimeoEventRegex = /vimeo\.com\/event\/(\d+)/;
    const vimeoEventMatch = url.match(vimeoEventRegex);
    if (vimeoEventMatch && vimeoEventMatch[1]) {
        return `https://player.vimeo.com/event/${vimeoEventMatch[1]}/embed?autoplay=1&api=1&color=ff0000&title=0&byline=0&portrait=0`;
    }

    // YouTube Detection
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    }

    return null;
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
        setIsSending(false);
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
                        <p className="text-gray-600 text-sm italic">The screening has started. Be the first to say hello!</p>
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
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const hasAccess = !movie?.isWatchPartyPaid || unlockedWatchPartyKeys.has(movieKey);
    const embedUrl = useMemo(() => movie ? getEmbedUrl(movie.fullMovie) : null, [movie]);
    const isLiveStream = useMemo(() => {
        return movie?.fullMovie?.toLowerCase().endsWith('.m3u8') || movie?.fullMovie?.includes('.m3u8?');
    }, [movie?.fullMovie]);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const partyRef = db.collection('watch_parties').doc(movieKey);
        const unsubscribe = partyRef.onSnapshot(doc => {
            if (doc.exists) {
                setPartyState(doc.data() as WatchPartyState);
            }
        });
        return () => unsubscribe();
    }, [movieKey]);
    
    useEffect(() => {
        if (!hasAccess || embedUrl) return; 
        const video = videoRef.current;
        if (!video) return;
        const handleCanPlay = () => setIsVideoReady(true);
        video.addEventListener('canplay', handleCanPlay);
        return () => { if (video) video.removeEventListener('canplay', handleCanPlay); };
    }, [hasAccess, embedUrl]);

    useEffect(() => {
        if (!hasAccess || embedUrl) return; 
        const video = videoRef.current;
        if (!video || !partyState) return;

        if (isLiveStream) {
            if (partyState.status === 'live' && video.paused) {
                video.play().catch(e => console.warn("Live stream play prevented", e));
            } else if (partyState.status === 'ended') {
                video.pause();
            }
            return;
        }

        if (partyState.isPlaying && video.paused) {
            video.play().catch(e => console.warn("Autoplay prevented", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 5) {
            video.currentTime = partyState.currentTime;
        }
    }, [partyState, hasAccess, isLiveStream, embedUrl]);

    const logSentiment = async (type: string) => {
        if (!videoRef.current) return;
        try {
            await fetch('/api/log-sentiment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, type, timestamp: videoRef.current.currentTime })
            });
        } catch (e) {}
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handlePaymentSuccess = async () => {
        setIsPaymentModalOpen(false);
        await unlockWatchParty(movieKey);
    };

    if (isFestivalLoading || !movie) return <LoadingSpinner />;

    if (partyState?.status === 'ended') {
        return (
             <div className="flex flex-col h-[100svh] bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4">This Watch Party has ended.</h1>
                <p className="text-gray-400 mb-6">Thanks for joining!</p>
                <button onClick={handleGoHome} className="submit-btn">Return to Home</button>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col h-[100svh] bg-black text-white relative overflow-hidden">
                 <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                 <button onClick={handleGoHome} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 z-20 shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                 <main className="relative z-10 flex-grow flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                        <h2 className="text-2xl font-bold mb-2">Watch Party Ticket Required</h2>
                        <p className="text-gray-400 mb-6">Join the live community screening for "{movie.title}".</p>
                        <div className="bg-white/5 rounded-lg p-4 mb-8">
                            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">Ticket Price</p>
                            <p className="text-4xl font-black text-white">${movie.watchPartyPrice?.toFixed(2) || '0.00'}</p>
                        </div>
                        <button onClick={() => setIsPaymentModalOpen(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg">Buy Ticket</button>
                    </div>
                 </main>
                 {isPaymentModalOpen && <SquarePaymentModal paymentType="watchPartyTicket" movie={movie} onClose={() => setIsPaymentModalOpen(false)} onPaymentSuccess={handlePaymentSuccess} />}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100svh] bg-black text-white overflow-hidden overscroll-none">
            <div className="flex-grow flex flex-col md:flex-row relative overflow-hidden h-full min-h-0">
                
                <div className="flex-grow flex flex-col relative h-full min-h-0">
                    {/* Header: Fixed size */}
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
                        <div className="w-6"></div>
                    </div>

                    {/* Media Player: Fixed Aspect Ratio */}
                    <div className="flex-none w-full aspect-video bg-black relative shadow-2xl z-30 overflow-hidden">
                        {embedUrl ? (
                            <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title={movie.title}
                            ></iframe>
                        ) : (
                            <>
                                {!isVideoReady && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                                        <img src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} alt="" className="w-full h-full object-cover blur-sm opacity-50" crossOrigin="anonymous" />
                                        <div className="absolute"><LoadingSpinner /></div>
                                    </div>
                                )}
                                <video 
                                    ref={videoRef} 
                                    src={movie.fullMovie} 
                                    className={`w-full h-full transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
                                    playsInline 
                                    autoPlay 
                                    controls={isLiveStream} 
                                />
                            </>
                        )}
                    </div>

                    {/* Reaction Bar: Dedicated row below video on mobile */}
                    <div className="flex-none bg-black/40 border-b border-white/5 py-2 px-4 flex justify-around items-center z-40">
                         {REACTION_TYPES.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => logSentiment(emoji)}
                                className="text-xl md:text-2xl hover:scale-125 transition-transform active:scale-95 drop-shadow-xl p-2 rounded-full"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    
                    {/* Chat Area: Fills remaining space, stays above keyboard */}
                    <div className="flex-grow flex flex-col md:hidden overflow-hidden bg-[#0a0a0a] min-h-0 relative">
                        <EmbeddedChat movieKey={movieKey} user={user} />
                    </div>
                </div>

                {/* Desktop Chat Sidebar */}
                <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 h-full border-l border-gray-800 min-h-0 overflow-hidden">
                    <EmbeddedChat movieKey={movieKey} user={user} />
                </div>
            </div>
        </div>
    );
};