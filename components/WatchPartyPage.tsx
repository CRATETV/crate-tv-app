import React, { useState, useRef, useEffect } from 'react';
import { Movie, ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';

interface WatchPartyPageProps {
    movieKey: string;
}

const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user } = useAuth();
    const { movies, isLoading: isFestivalLoading } = useFestival();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const movie = movies[movieKey];

    // Set up a real-time listener for chat messages
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(100);
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(fetchedMessages);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [movieKey]);

    // Auto-scroll to the latest message
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
                body: JSON.stringify({
                    movieKey,
                    userName: user.name || user.email,
                    userAvatar: user.avatar || 'fox',
                    text: newMessage,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message.');
            }
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
            // Optionally show an error to the user
        } finally {
            setIsSending(false);
        }
    };
    
    const handleGoBack = () => {
        window.history.back();
    };

    if (isFestivalLoading) {
        return <LoadingSpinner />;
    }

    if (!movie) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <p>Movie not found.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-black text-white font-sans">
            {/* Video Player Section */}
            <div className="relative w-full lg:w-3/4 bg-black flex flex-col">
                 <button onClick={handleGoBack} className="absolute top-4 left-4 z-20 bg-black/50 rounded-full p-2 hover:bg-black/70" aria-label="Go Back">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                 <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent text-center z-10 pointer-events-none">
                    <h1 className="text-lg font-bold">{movie.title} - Watch Party</h1>
                 </div>
                <div className="flex-grow flex items-center justify-center">
                    <video ref={videoRef} src={movie.fullMovie} controls className="w-full max-h-full" />
                </div>
            </div>

            {/* Chat Section */}
            <div className="w-full lg:w-1/4 h-1/2 lg:h-full flex flex-col bg-gray-900 border-t-2 lg:border-t-0 lg:border-l-2 border-gray-700">
                <h2 className="p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0">Live Chat</h2>
                
                {/* Messages */}
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
                
                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Say something..."
                            className="form-input flex-grow"
                            disabled={!user || isSending}
                        />
                        <button type="submit" className="submit-btn !px-4" disabled={!user || isSending || !newMessage.trim()}>
                            Send
                        </button>
                    </div>
                     {!user && <p className="text-xs text-yellow-400 mt-2 text-center">You must be logged in to chat.</p>}
                </form>
            </div>
        </div>
    );
};

export default WatchPartyPage;
