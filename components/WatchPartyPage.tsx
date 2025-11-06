import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Movie, ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import { avatars } from './avatars';
import Countdown from './Countdown';
import WatchPartyLiveModal from './WatchPartyLiveModal';
import SquarePaymentModal from './SquarePaymentModal';

interface WatchPartyPageProps {
    movieKey: string;
}

const getWatchPartyStatus = (movie: Movie | undefined): 'not_enabled' | 'upcoming' | 'live' | 'ended' => {
    if (!movie?.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return 'not_enabled';
    }

    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // Assume a 4-hour duration

    if (now < startTime) {
        return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
        return 'live';
    } else {
        return 'ended';
    }
};

const WatchPartyPaywall: React.FC<{ movie: Movie; onPay: () => void; }> = ({ movie, onPay }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center" style={{backgroundImage: `url(${movie.poster})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-lg"></div>
        <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">Join the Watch Party</h1>
            <p className="text-lg md:text-xl text-gray-300 mb-6">for "{movie.title}"</p>
            <div className="bg-black/50 rounded-lg p-6">
                <p className="text-lg text-gray-200 mb-4">This is a ticketed event. Purchase access to join the live watch party.</p>
                <button onClick={onPay} className="submit-btn bg-purple-600 hover:bg-purple-700 text-lg w-full">
                    Pay { (movie.salePrice || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) } to Join
                </button>
            </div>
             <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition mt-8">Go Back</button>
        </div>
    </div>
);


const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { user, purchasedMovieKeys, purchaseMovie } = useAuth();
    const { movies, isLoading: isFestivalLoading } = useFestival();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showLiveAnnouncement, setShowLiveAnnouncement] = useState(true);

    const movie = movies[movieKey];
    const [status, setStatus] = useState(() => getWatchPartyStatus(movie));

    // State for payment flow
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false); // Used to grant immediate access post-payment
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

    const isPaidParty = useMemo(() => movie?.isWatchPartyEnabled && movie.isForSale, [movie]);
    const purchasedMovieKeysSet = useMemo(() => new Set(purchasedMovieKeys), [purchasedMovieKeys]);
    const hasAccess = !isPaidParty || purchasedMovieKeysSet.has(movieKey) || paymentSuccess;

    useEffect(() => {
        // If the status changes (e.g. from context update), re-evaluate
        setStatus(getWatchPartyStatus(movie));
    }, [movie]);
    
    // Timer to automatically switch from 'upcoming' to 'live'
    useEffect(() => {
        if (status === 'upcoming' && movie?.watchPartyStartTime) {
            const startTime = new Date(movie.watchPartyStartTime).getTime();
            const interval = setInterval(() => {
                if (Date.now() >= startTime) {
                    setStatus('live');
                    clearInterval(interval);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status, movie]);

    // Set up a real-time listener for chat messages
    useEffect(() => {
        if (status !== 'live' || !hasAccess) return;

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
    }, [movieKey, status, hasAccess]);

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
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
                <h1 className="text-2xl font-bold mb-4">Movie Not Found</h1>
                <button onClick={handleGoBack} className="submit-btn">Go Back</button>
            </div>
        );
    }
    
    if (status === 'not_enabled' || status === 'ended') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Watch Party {status === 'ended' ? 'Has Ended' : 'Not Available'}</h1>
                <p className="text-gray-400 mb-6">This watch party for "{movie.title}" is not currently active.</p>
                <button onClick={handleGoBack} className="submit-btn">Go Back</button>
            </div>
        );
    }

    if (status === 'upcoming' && movie.watchPartyStartTime) {
         return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4 text-center" style={{backgroundImage: `url(${movie.poster})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-lg"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-5xl font-bold mb-2">Watch Party for "{movie.title}"</h1>
                    <p className="text-lg md:text-xl text-gray-300 mb-6">Get ready! The party is about to begin.</p>
                    <div className="bg-black/50 rounded-lg p-6 text-4xl md:text-6xl font-bold">
                        <Countdown prefix="Starting in" targetDate={movie.watchPartyStartTime} onEnd={() => setStatus('live')} />
                    </div>
                    <button onClick={handleGoBack} className="submit-btn mt-8">Go Back</button>
                </div>
            </div>
        );
    }
    
    if (status === 'live' && !hasAccess) {
        return (
            <>
                <WatchPartyPaywall movie={movie} onPay={() => setIsPaying(true)} />
                {isPaying && (
                    <SquarePaymentModal
                        movie={movie}
                        paymentType="movie"
                        onClose={() => setIsPaying(false)}
                        onPaymentSuccess={async () => {
                            await purchaseMovie(movieKey);
                            setIsPaying(false);
                            setPaymentSuccess(true);
                        }}
                    />
                )}
            </>
        );
    }
    
    if (status === 'live' && showLiveAnnouncement) {
        return (
            <WatchPartyLiveModal 
                movie={movie} 
                onJoin={() => setShowLiveAnnouncement(false)} 
            />
        );
    }


    return (
        <>
        <div className="flex flex-col md:flex-row h-screen bg-black text-white font-sans">
            {/* Video Player Section */}
            <div className="relative w-full md:w-3/4 aspect-video md:aspect-auto flex-shrink-0 bg-black flex flex-col">
                 <button onClick={handleGoBack} className="absolute top-4 left-4 z-20 bg-black/50 rounded-full p-2 hover:bg-black/70" aria-label="Go Back">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                 <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent text-center z-10 pointer-events-none">
                    <h1 className="text-lg font-bold">{movie.title} - Watch Party</h1>
                 </div>
                <div className="flex-grow flex items-center justify-center">
                    <video ref={videoRef} src={movie.fullMovie} controls playsInline className="w-full max-h-full" />
                </div>
            </div>

            {/* Chat Section */}
            <div className="w-full md:w-1/4 flex-grow flex flex-col bg-gray-900 border-t-2 md:border-t-0 md:border-l-2 border-gray-700 min-h-0">
                 <div className="p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
                    <h2 className="text-base">Live Chat</h2>
                    {!movie.hasCopyrightMusic && (
                        <button onClick={() => setIsDonationModalOpen(true)} className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-md">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0V7.5A1.5 1.5 0 0110 6V3.5zM3.5 6A1.5 1.5 0 015 4.5h1.5a1.5 1.5 0 013 0V6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1H3a1 1 0 01-1-1V6a1 1 0 011-1h.5zM6 14.5a1.5 1.5 0 013 0V16a1 1 0 001 1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3.5a1.5 1.5 0 01-3 0v-1.5A1.5 1.5 0 016 15v-1.5z" /></svg>
                            Support Filmmaker
                        </button>
                    )}
                </div>
                
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
        {isDonationModalOpen && (
            <SquarePaymentModal
                movie={movie}
                paymentType="donation"
                onClose={() => setIsDonationModalOpen(false)}
                onPaymentSuccess={() => {
                    // Optionally show a success message in chat or as a toast
                    setIsDonationModalOpen(false);
                }}
            />
        )}
        </>
    );
};

export default WatchPartyPage;
