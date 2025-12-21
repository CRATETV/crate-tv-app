
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
            const response = await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, userName: user.name || user.email, userAvatar: user.avatar || 'fox', text: newMessage }),
            });
            if (!response.ok) throw new Error('Failed to send message.');
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0a0a] md:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-hidden">
            <div className="hidden md:flex p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0">
                <h2 className="text-sm uppercase tracking-widest text-gray-400">Live Chat</h2>
            </div>
            
            {/* Message Area - This area shrinks when the keyboard opens */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-8">
                        <p className="text-gray-600 text-sm italic">The party is quiet... say something to start the conversation!</p>
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

            {/* Input Box - Styled for mobile with extra bottom clearance */}
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
        if (!hasAccess) return;
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = () => setIsVideoReady(true);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            if (video) {
                video.removeEventListener('canplay', handleCanPlay);
            }
        };
    }, [hasAccess]);

    useEffect(() => {
        if (!hasAccess) return;
        const video = videoRef.current;
        if (!video || !partyState) return;

        if (partyState.isPlaying && video.paused) {
            video.play().catch(e => console.warn("Autoplay was prevented by browser", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 5) {
            video.currentTime = partyState.currentTime;
        }
    }, [partyState, hasAccess]);

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handlePaymentSuccess = async () => {
        setIsPaymentModalOpen(false);
        await unlockWatchParty(movieKey);
    };

    if (isFestivalLoading || !movie) {
        return <LoadingSpinner />;
    }

    if (partyState?.status === 'ended') {
        return (
             <div className="flex flex-col h-[100dvh] bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4">This Watch Party has ended.</h1>
                <p className="text-gray-400 mb-6">Thanks for joining! You can now watch the film on your own time.</p>
                <button onClick={handleGoHome} className="submit-btn">Return to Home</button>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col h-[100dvh] bg-black text-white relative overflow-hidden">
                 <img src={movie.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                 
                 <button onClick={handleGoHome} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 z-20" aria-label="Back to Home">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>

                 <main className="relative z-10 flex-grow flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center border-2 border-purple-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Watch Party Ticket Required</h2>
                        <p className="text-gray-400 mb-6">This is an exclusive community event for "{movie.title}". Purchase your ticket to join the live screening and chat.</p>
                        
                        <div className="bg-white/5 rounded-lg p-4 mb-8">
                            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">Ticket Price</p>
                            <p className="text-4xl font-black text-white">${movie.watchPartyPrice?.toFixed(2) || '0.00'}</p>
                        </div>

                        <button 
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-lg transition-transform active:scale-95 shadow-lg"
                        >
                            Buy Ticket
                        </button>
                    </div>
                 </main>
                 {isPaymentModalOpen && (
                    <SquarePaymentModal
                        paymentType="watchPartyTicket"
                        movie={movie}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                 )}
            </div>
        );
    }

    if (partyState?.status === 'waiting') {
        return (
             <div className="flex flex-col h-[100dvh] bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4 animate-pulse">Waiting for the host...</h1>
                <p className="text-gray-400">The screening for "{movie.title}" will begin shortly.</p>
                <div className="mt-12 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-bold uppercase tracking-widest">You are in the lobby</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col md:flex-row h-[100dvh] bg-black text-white overflow-hidden">
            {/* Player + Mobile Chat Container */}
            <div className="flex-grow flex flex-col relative overflow-hidden h-full">
                
                {/* Mobile Header Bar - Fixed height, won't move */}
                <div className="flex-none bg-black/90 backdrop-blur-md p-3 flex items-center justify-between border-b border-white/5 md:hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
                     <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors" aria-label="Back to Home">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div className="text-center min-w-0 px-4">
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none mb-1">Live Watch Party</p>
                        <h2 className="text-xs font-bold truncate text-gray-200">{movie.title}</h2>
                    </div>
                    <div className="w-6"></div> {/* Spacer */}
                </div>

                {/* Desktop Back Button */}
                <button onClick={handleGoHome} className="hidden md:flex absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 z-20" aria-label="Back to Home">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>

                {/* The Player - Flex-none ensures it stays at the top regardless of keyboard */}
                <div className="flex-none w-full aspect-video bg-black relative shadow-2xl z-10">
                    {!isVideoReady && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                            <img 
                                src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} 
                                alt="" 
                                className="w-full h-full object-cover blur-sm opacity-50" 
                                crossOrigin="anonymous"
                            />
                            <div className="absolute">
                                <LoadingSpinner />
                            </div>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        src={movie.fullMovie}
                        className={`w-full h-full transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                        playsInline
                        autoPlay
                        controls={false}
                    />
                </div>
                
                {/* Chat Area (Mobile) - flex-grow handles the keyboard resize */}
                <div className="flex-grow flex flex-col md:hidden relative overflow-hidden bg-[#0a0a0a]">
                    <EmbeddedChat movieKey={movieKey} user={user} />
                </div>
            </div>

            {/* Desktop Sidebar Chat */}
            <div className="hidden md:block w-80 lg:w-96 flex-shrink-0 h-full">
                <EmbeddedChat movieKey={movieKey} user={user} />
            </div>
        </div>
    );
};
