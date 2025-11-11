import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';

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
        const unsubscribe = messagesRef.onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => { fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage); });
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
        <div className="w-full h-full flex flex-col bg-gray-900 border-t-2 md:border-t-0 md:border-l-2 border-gray-700">
            <div className="p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0">
                <h2 className="text-base">Live Chat</h2>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 p-1" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div>
                            <p className="font-bold text-sm text-white">{msg.userName}</p>
                            <p className="text-sm text-gray-300 break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Say something..." className="form-input flex-grow" disabled={!user || isSending} />
                    <button type="submit" className="submit-btn !px-4" disabled={!user || isSending || !newMessage.trim()}>Send</button>
                </div>
            </form>
        </div>
    );
};


export const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user } = useAuth();
    const { movies: allMovies, isLoading: isFestivalLoading } = useFestival();
    const movie = allMovies[movieKey];
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [partyState, setPartyState] = useState<WatchPartyState>();
    const [isVideoReady, setIsVideoReady] = useState(false);

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
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = () => setIsVideoReady(true);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            if (video) {
                video.removeEventListener('canplay', handleCanPlay);
            }
        };
    }, []);

    useEffect(() => {
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
    }, [partyState]);

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isFestivalLoading || !movie) {
        return <LoadingSpinner />;
    }

    if (partyState?.status === 'ended') {
        return (
             <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4">This Watch Party has ended.</h1>
                <p className="text-gray-400 mb-6">Thanks for joining! You can now watch the film on your own time.</p>
                <button onClick={handleGoHome} className="submit-btn">Return to Home</button>
            </div>
        );
    }

    if (partyState?.status === 'waiting') {
        return (
             <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center text-center p-4">
                <h1 className="text-4xl font-bold mb-4 animate-pulse">Waiting for the host to start the party...</h1>
                <p className="text-gray-400">The screening for "{movie.title}" will begin shortly.</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col md:flex-row h-screen bg-black text-white">
            <div className="flex-grow flex flex-col relative">
                <button onClick={handleGoHome} className="absolute top-4 left-4 bg-black/50 rounded-full p-2 hover:bg-black/70 z-20" aria-label="Back to Home">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="w-full aspect-video bg-black flex-shrink-0 relative">
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
                        controls={false} // Controls are handled by the host
                    />
                </div>
            </div>
            <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-1/2 md:h-full">
                <EmbeddedChat movieKey={movieKey} user={user} />
            </div>
        </div>
    );
};
