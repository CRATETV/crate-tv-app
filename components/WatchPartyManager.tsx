import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

// --- HELPER FUNCTIONS ---

const getPartyStatusText = (movie: Movie, partyState?: WatchPartyState) => {
    if (!movie.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return { text: 'Disabled', color: 'bg-gray-500' };
    }
    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    if (now < startTime) {
        return { text: 'Upcoming', color: 'bg-blue-500' };
    }
    if (partyState?.status === 'live') {
        return { text: 'Live', color: 'bg-red-500 animate-pulse' };
    }
    if (partyState?.status === 'waiting') {
        return { text: 'Waiting for Host', color: 'bg-yellow-500' };
    }
    return { text: 'Ended', color: 'bg-gray-700' };
};


// --- CHILD COMPONENTS ---

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
        <div className="w-full h-full flex flex-col bg-gray-900 border-l-2 border-gray-700">
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

const WatchPartyControlRoom: React.FC<{
    movie: Movie;
    partyState: WatchPartyState | undefined;
    onStartParty: () => void;
    onSyncState: (state: Partial<WatchPartyState>) => void;
}> = ({ movie, partyState, onStartParty, onSyncState }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    const lastSyncTime = useRef(0);

    const handlePlay = () => onSyncState({ isPlaying: true });
    const handlePause = () => videoRef.current && onSyncState({ isPlaying: false, currentTime: videoRef.current.currentTime });
    const handleSeeked = () => videoRef.current && onSyncState({ currentTime: videoRef.current.currentTime });
    
    // Periodically sync time while playing to keep viewers in check
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (video && !video.paused && (Date.now() - lastSyncTime.current > 5000)) {
            lastSyncTime.current = Date.now();
            onSyncState({ currentTime: video.currentTime });
        }
    };
    
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !partyState) return;
        
        // This logic is for the admin's player to reflect the canonical state.
        // It's less critical since the admin is the source of truth, but good for consistency.
        if (partyState.isPlaying && video.paused) {
            video.play().catch(e => console.warn("Admin autoplay was prevented", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 3) {
            video.currentTime = partyState.currentTime;
        }
    }, [partyState]);
    
    const status = getPartyStatusText(movie, partyState);
    const canStart = movie.isWatchPartyEnabled && movie.watchPartyStartTime && new Date() >= new Date(movie.watchPartyStartTime) && partyState?.status === 'waiting';

    return (
        <div className="mb-8 bg-black/50 p-6 rounded-lg border-2 border-pink-500">
            <h2 className="text-2xl font-bold text-white mb-4">Current Watch Party Control Room</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            src={movie.fullMovie}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeeked={handleSeeked}
                            onTimeUpdate={handleTimeUpdate}
                            controls
                            className="w-full h-full"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50 p-4 rounded-lg">
                        <div>
                            <h3 className="text-xl font-bold">{movie.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>
                                    {status.text}
                                </span>
                                <span className="text-sm text-gray-400">
                                    {movie.watchPartyStartTime && `Scheduled for: ${new Date(movie.watchPartyStartTime).toLocaleString()}`}
                                </span>
                            </div>
                        </div>
                        {canStart && (
                            <button onClick={onStartParty} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md w-full sm:w-auto">
                                Start Party For Everyone
                            </button>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1 h-[60vh] md:h-auto min-h-[500px]">
                     <EmbeddedChat movieKey={movie.key} user={user} />
                </div>
            </div>
        </div>
    );
};

// Correctly formats a UTC ISO string for a datetime-local input, accounting for timezone.
const formatISOForInput = (isoString?: string): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        
        // Create a new date that is offset by the timezone, so the final ISO string's YYYY-MM-DDTHH:MM part matches the local time.
        const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
        const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
        
        return localISOTime;
    } catch (e) {
        return '';
    }
};


const MovieRow: React.FC<{ movie: Movie; partyState?: WatchPartyState; onChange: (updates: Partial<Movie>) => void; }> = ({ movie, partyState, onChange }) => {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ isWatchPartyEnabled: e.target.checked });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Convert the local datetime-local string to a UTC ISO string before saving
        if (e.target.value) {
            const localDate = new Date(e.target.value);
            onChange({ watchPartyStartTime: localDate.toISOString() });
        } else {
            onChange({ watchPartyStartTime: '' });
        }
    };

    const status = getPartyStatusText(movie, partyState);

    return (
        <tr className="border-b border-gray-700">
            <td className="p-3 font-medium text-white">{movie.title}</td>
            <td className="p-3">
                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>
                    {status.text}
                </span>
            </td>
            <td className="p-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-pink-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
            </td>
            <td className="p-3">
                <input
                    type="datetime-local"
                    value={formatISOForInput(movie.watchPartyStartTime)}
                    onChange={handleTimeChange}
                    className="form-input !py-1 text-sm"
                    disabled={!movie.isWatchPartyEnabled}
                />
            </td>
        </tr>
    );
};


// --- MAIN COMPONENT ---

const WatchPartyManager: React.FC<{ allMovies: Record<string, Movie>; onSave: (movie: Movie) => Promise<void>; }> = ({ allMovies, onSave }) => {
    const [movieSettings, setMovieSettings] = useState<Record<string, Movie>>(allMovies);
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [filter, setFilter] = useState('');
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
    const { user } = useAuth();
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach((doc: firebase.firestore.QueryDocumentSnapshot) => {
                states[doc.id] = doc.data() as WatchPartyState;
            });
            setPartyStates(states);
        });
        return () => unsub();
    }, []);

    const currentPartyMovie = useMemo(() => {
        const now = new Date();
        const enabledMovies = (Object.values(movieSettings) as Movie[])
            .filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime)
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        const liveOrWaiting = enabledMovies.find(m => {
            const state = partyStates[m.key];
            const startTime = new Date(m.watchPartyStartTime!);
            // A party is considered "active" if it's within the 4-hour window from its start time
            return startTime <= now && (now.getTime() - startTime.getTime() < 4 * 60 * 60 * 1000);
        });

        if (liveOrWaiting) return liveOrWaiting;

        const nextUpcoming = enabledMovies.find(m => new Date(m.watchPartyStartTime!) > now);
        return nextUpcoming || null;
    }, [movieSettings, partyStates]);

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(allMovies) !== JSON.stringify(movieSettings);
    }, [allMovies, movieSettings]);

    const handleMovieChange = (movieKey: string, updates: Partial<Movie>) => {
        setMovieSettings(prev => ({
            ...prev,
            [movieKey]: { ...prev[movieKey], ...updates },
        }));
    };
    
    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        const changedMovies = Object.keys(movieSettings)
            .filter(key => JSON.stringify(allMovies[key]) !== JSON.stringify(movieSettings[key]))
            .map(key => movieSettings[key]);
        
        try {
            await Promise.all(changedMovies.map(movie => onSave(movie)));
            setSaveStatus('success');
        } catch (error) {
            console.error("Failed to save watch party settings:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleSyncState = useCallback(async (newState: Partial<WatchPartyState>) => {
        if (!user || !currentPartyMovie) return;
        const db = getDbInstance();
        if (!db) return;

        const syncRef = db.collection('watch_parties').doc(currentPartyMovie.key);
        await syncRef.set({
            ...newState,
            lastUpdatedBy: user.name || user.email,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }, [currentPartyMovie, user]);
    
    const handleStartParty = async () => {
        if (!currentPartyMovie) return;
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/start-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: currentPartyMovie.key, password }),
            });
            if (!response.ok) {
                throw new Error((await response.json()).error || 'Failed to start party.');
            }
        } catch (error) {
            alert(`Error: Could not start the party. ${(error as Error).message}`);
        }
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(movie => movie.title.toLowerCase().includes(filter.toLowerCase()))
        .filter(movie => !showOnlyEnabled || movieSettings[movie.key]?.isWatchPartyEnabled)
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <>
            {currentPartyMovie && (
                <WatchPartyControlRoom
                    movie={currentPartyMovie}
                    partyState={partyStates[currentPartyMovie.key]}
                    onStartParty={handleStartParty}
                    onSyncState={handleSyncState}
                />
            )}

            <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-pink-400">Schedule a Watch Party</h2>
                <p className="text-sm text-gray-400 mb-6">Enable a party and set a future start time. Only one party can be active or upcoming at a time. Click "Save All Changes" to publish your schedule.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Filter movies..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="form-input flex-grow"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                            type="checkbox"
                            checked={showOnlyEnabled}
                            onChange={e => setShowOnlyEnabled(e.target.checked)}
                            className="h-4 w-4 bg-gray-700 border-gray-600 text-pink-500 rounded focus:ring-pink-500"
                        />
                        Show only enabled
                    </label>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                            <tr>
                                <th className="p-3">Film Title</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Enabled</th>
                                <th className="p-3">Start Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovies.map(movie => (
                                <MovieRow 
                                    key={movie.key} 
                                    movie={movieSettings[movie.key]} 
                                    partyState={partyStates[movie.key]}
                                    onChange={(updates) => handleMovieChange(movie.key, updates)} 
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 flex items-center gap-4">
                    <button
                        onClick={handleSaveAll}
                        disabled={!hasUnsavedChanges || isSaving}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                    {saveStatus === 'success' && <span className="text-green-500 text-sm">Changes saved successfully!</span>}
                    {saveStatus === 'error' && <span className="text-red-500 text-sm">Failed to save changes.</span>}
                </div>
            </div>
        </>
    );
};

export default WatchPartyManager;