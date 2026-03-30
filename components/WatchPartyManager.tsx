import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage, FestivalDay, CrateFestConfig, FilmBlock } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

// --- TYPES ---

interface WatchableItem {
    id: string;
    title: string;
    type: 'movie' | 'block';
    isWatchPartyEnabled?: boolean;
    watchPartyStartTime?: string;
    fullMovie?: string; // Only for movies
    movieKeys?: string[]; // Only for blocks
}

// --- HELPER FUNCTIONS ---

const getPartyStatusText = (item: WatchableItem, partyState?: WatchPartyState) => {
    if (!item.isWatchPartyEnabled || !item.watchPartyStartTime) {
        return { text: 'Disabled', color: 'bg-gray-500' };
    }
    const now = new Date();
    const startTime = new Date(item.watchPartyStartTime);
    if (now < startTime) {
        return { text: 'Upcoming', color: 'bg-blue-500' };
    }
    if (partyState?.status === 'live') {
        return { text: 'Live', color: 'bg-red-500 animate-pulse' };
    }
    if (partyState?.status === 'waiting' || !partyState) {
        return { text: 'Waiting for Host', color: 'bg-yellow-500' };
    }
    return { text: 'Ended', color: 'bg-gray-700' };
};


// --- CHILD COMPONENTS ---

const EmbeddedChat: React.FC<{ 
    movieKey: string; 
    user: { name?: string; email: string | null; avatar?: string; } | null;
    isQALive?: boolean;
    qaEmbed?: string;
    isWebcamLive?: boolean;
    isBackstageVerified?: boolean;
    backstageKey?: string;
    allMovies?: Record<string, Movie>;
}> = ({ movieKey, user, isQALive, qaEmbed, isBackstageVerified, backstageKey, allMovies }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isTogglingQA, setIsTogglingQA] = useState(false);
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
            await fetch('/api/send-chat-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey, 
                    userName: 'CRATETV', 
                    userAvatar: 'crate', 
                    text: newMessage,
                    isAdmin: true
                }),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const toggleQA = async () => {
        if (!backstageKey) return;
        setIsTogglingQA(true);
        try {
            const newQAState = !isQALive;
            let embedUrl = qaEmbed || '';
            let useWebcam = false;
            
            if (newQAState && !embedUrl) {
                const mode = window.prompt("Director Video Mode:\n1. Select Movie from Library\n2. Enter URL (YouTube/Vimeo/Direct)\n3. Use Live Webcam (In-House)\n\nEnter 1, 2, or 3:", "3");
                
                if (mode === "1" && allMovies) {
                    const movieKeys = Object.keys(allMovies);
                    const movieTitles = movieKeys.map(k => `${k}: ${allMovies[k].title}`).join('\n');
                    const input = window.prompt(`Select a movie by entering its key:\n\n${movieTitles}`);
                    if (!input) {
                        setIsTogglingQA(false);
                        return;
                    }
                    if (allMovies[input]) {
                        embedUrl = allMovies[input].fullMovie;
                    } else {
                        alert("Invalid movie key. Using input as raw URL.");
                        embedUrl = input;
                    }
                } else if (mode === "2") {
                    const input = window.prompt("Enter Director's Video Stream URL (YouTube, Vimeo, Restream, or direct .mp4 link):");
                    if (!input) {
                        setIsTogglingQA(false);
                        return;
                    }
                    embedUrl = input;
                } else if (mode === "3") {
                    useWebcam = true;
                    embedUrl = "WEBCAM_LIVE";
                } else {
                    setIsTogglingQA(false);
                    return;
                }
            }

            const res = await fetch('/api/toggle-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey, 
                    backstageKey, 
                    isQALive: newQAState,
                    qaEmbed: embedUrl,
                    isWebcamLive: useWebcam
                }),
            });
            if (!res.ok) throw new Error("Failed to toggle Q&A.");
        } catch (error) {
            console.error("QA Toggle Error:", error);
            alert("Failed to toggle Q&A mode.");
        } finally {
            setIsTogglingQA(false);
        }
    };

    const handleClearChat = async () => {
        if (!confirm("Are you sure you want to clear ALL messages for this watch party? This cannot be undone.")) return;
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) return;

        setIsClearing(true);
        try {
            const res = await fetch('/api/clear-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey, adminPassword }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to clear chat.');
            }
        } catch (error) {
            console.error("Failed to clear chat:", error);
            alert(`Error: ${(error as Error).message}`);
        } finally {
            setIsClearing(false);
        }
    };

    const downloadChat = () => {
        if (messages.length === 0) return;
        
        const csvContent = [
            ['Timestamp', 'User', 'Message'],
            ...messages.map(msg => [
                msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'N/A',
                msg.userName,
                msg.text
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `chat_history_${movieKey}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        link.remove();
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-900 border-l-2 border-gray-700">
            <div className="p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-base">Live Chat</h2>
                <div className="flex items-center gap-2">
                    {isBackstageVerified && (
                        <button 
                            onClick={toggleQA}
                            disabled={isTogglingQA}
                            className={`text-[8px] font-black uppercase tracking-widest ${isQALive ? 'text-red-500' : 'text-emerald-500'} hover:text-white transition-colors flex items-center gap-1`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {isQALive ? 'End Video' : 'Join w/ Video'}
                        </button>
                    )}
                    <button 
                        onClick={downloadChat}
                        className="text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download
                    </button>
                    <button 
                        onClick={handleClearChat}
                        disabled={isClearing}
                        className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {isClearing ? 'Clearing...' : 'Clear'}
                    </button>
                </div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 p-1" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div>
                            <div className="flex items-center gap-2">
                                <p className={`font-bold text-sm ${msg.isAdmin ? 'text-pink-500' : 'text-white'}`}>{msg.userName}</p>
                                {msg.isAdmin && <span className="bg-pink-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Admin</span>}
                                {msg.isVerifiedDirector && <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Director</span>}
                            </div>
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
    item: WatchableItem;
    partyState: WatchPartyState | undefined;
    onStartParty: () => void;
    onTerminateParty: () => void;
    onSyncState: (state: Partial<WatchPartyState>) => void;
    allMovies: Record<string, Movie>;
}> = ({ item, partyState, onStartParty, onTerminateParty, onSyncState, allMovies }) => {
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

    const currentMovie = useMemo(() => {
        if (item.type === 'movie') return allMovies[item.id];
        if (item.type === 'block' && item.movieKeys && item.movieKeys.length > 0) {
            // For blocks, we show the first movie in the control room for simplicity, 
            // but the actual party will cycle through them based on time.
            return allMovies[item.movieKeys[0]];
        }
        return null;
    }, [item, allMovies]);
    
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !partyState) return;
        
        if (partyState.isPlaying && video.paused) {
            video.play().catch(e => console.warn("Admin autoplay was prevented", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 3) {
            video.currentTime = partyState.currentTime;
        }
    }, [partyState]);
    
    const status = getPartyStatusText(item, partyState);
    const isLive = partyState?.status === 'live';
    const canStart = item.isWatchPartyEnabled && (partyState?.status === 'waiting' || partyState?.status === 'ended' || !partyState);
    
    const [isStarting, setIsStarting] = useState(false);
    const [isTogglingQA, setIsTogglingQA] = useState(false);

    const handleStartWithLoading = async () => {
        setIsStarting(true);
        try {
            await onStartParty();
        } finally {
            setIsStarting(false);
        }
    };

    const toggleQA = async () => {
        if (!partyState?.backstageKey) return;
        setIsTogglingQA(true);
        try {
            const newQAState = !partyState.isQALive;
            let embedUrl = partyState.qaEmbed || '';
            let useWebcam = false;
            
            if (newQAState && !embedUrl) {
                const mode = window.prompt("Director Video Mode:\n1. Select Movie from Library\n2. Enter URL (YouTube/Vimeo/Direct)\n3. Use Live Webcam (In-House)\n\nEnter 1, 2, or 3:", "3");
                
                if (mode === "1" && allMovies) {
                    const movieKeys = Object.keys(allMovies);
                    const movieTitles = movieKeys.map(k => `${k}: ${allMovies[k].title}`).join('\n');
                    const input = window.prompt(`Select a movie by entering its key:\n\n${movieTitles}`);
                    if (!input) {
                        setIsTogglingQA(false);
                        return;
                    }
                    if (allMovies[input]) {
                        embedUrl = allMovies[input].fullMovie;
                    } else {
                        alert("Invalid movie key. Using input as raw URL.");
                        embedUrl = input;
                    }
                } else if (mode === "2") {
                    const input = window.prompt("Enter Director's Video Stream URL (YouTube, Vimeo, Restream, or direct .mp4 link):");
                    if (!input) {
                        setIsTogglingQA(false);
                        return;
                    }
                    embedUrl = input;
                } else if (mode === "3") {
                    useWebcam = true;
                    embedUrl = "WEBCAM_LIVE";
                } else {
                    setIsTogglingQA(false);
                    return;
                }
            }

            const res = await fetch('/api/toggle-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    movieKey: item.id, 
                    backstageKey: partyState.backstageKey, 
                    isQALive: newQAState,
                    qaEmbed: embedUrl,
                    isWebcamLive: useWebcam
                }),
            });
            if (!res.ok) throw new Error("Failed to toggle Q&A.");
        } catch (error) {
            console.error("QA Toggle Error:", error);
            alert("Failed to toggle Q&A mode.");
        } finally {
            setIsTogglingQA(false);
        }
    };

    return (
        <div className="mb-8 bg-black/50 p-6 rounded-lg border-2 border-pink-500">
            <h2 className="text-2xl font-bold text-white mb-4">Current Watch Party Control Room</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        {currentMovie ? (
                            <video
                                ref={videoRef}
                                src={currentMovie.fullMovie}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onSeeked={handleSeeked}
                                onTimeUpdate={handleTimeUpdate}
                                controls
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">No content available</div>
                        )}
                    </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50 p-4 rounded-lg">
                        <div>
                            <h3 className="text-xl font-bold">{item.title} {item.type === 'block' && <span className="text-xs bg-pink-600 px-2 py-0.5 rounded ml-2">BLOCK</span>}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.text === 'Upcoming' && canStart ? 'bg-yellow-500' : status.color}`}>
                                    {status.text === 'Upcoming' && canStart ? 'Ready to Start' : status.text}
                                </span>
                                <span className="text-sm text-gray-400">
                                    {item.watchPartyStartTime && `Scheduled for: ${new Date(item.watchPartyStartTime).toLocaleString()}`}
                                </span>
                            </div>
                            {partyState?.backstageKey && (
                                <div className="mt-2 p-2 bg-pink-600/20 border border-pink-500/30 rounded inline-flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-pink-400">Backstage Key:</span>
                                    <span className="text-sm font-mono font-bold text-white tracking-widest">{partyState.backstageKey}</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(partyState.backstageKey!);
                                            alert("Key copied to clipboard!");
                                        }}
                                        className="text-[10px] text-pink-400 hover:text-white underline"
                                    >
                                        Copy
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            {isLive && (
                                <button 
                                    onClick={toggleQA}
                                    disabled={isTogglingQA}
                                    className={`font-bold py-3 px-6 rounded-md transition-all flex items-center justify-center gap-2 ${partyState?.isQALive ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    {partyState?.isQALive ? 'Director Video: ON' : 'Director Video: OFF'}
                                </button>
                            )}
                            {canStart && (
                                <button 
                                    onClick={handleStartWithLoading} 
                                    disabled={isStarting}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-3 px-6 rounded-md w-full sm:w-auto shadow-[0_0_20px_rgba(22,163,74,0.4)] transition-all flex items-center justify-center gap-2"
                                >
                                    {isStarting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Launching...
                                        </>
                                    ) : (
                                        partyState?.status === 'ended' ? 'Restart Party' : 'Start Party For Everyone'
                                    )}
                                </button>
                            )}
                            {isLive && (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={handleStartWithLoading} 
                                        disabled={isStarting}
                                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-3 px-6 rounded-md shadow-[0_0_15px_rgba(220,38,38,0.3)] opacity-50 hover:opacity-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isStarting ? 'Resetting...' : 'Reset Party'}
                                    </button>
                                    <button 
                                        onClick={onTerminateParty} 
                                        className="bg-gray-700 hover:bg-black text-white font-bold py-3 px-6 rounded-md border border-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        Terminate Party
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 h-[60vh] md:h-auto min-h-[500px]">
                     <EmbeddedChat 
                        movieKey={item.id} 
                        user={user} 
                        isQALive={partyState?.isQALive} 
                        qaEmbed={partyState?.qaEmbed} 
                        isWebcamLive={partyState?.isWebcamLive}
                        isBackstageVerified={true} 
                        backstageKey={partyState?.backstageKey}
                        allMovies={allMovies}
                    />
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


const MovieRow: React.FC<{ 
    item: WatchableItem; 
    partyState?: WatchPartyState; 
    isSelected: boolean; 
    onSelect: () => void; 
    onChange: (updates: Partial<WatchableItem>) => void; 
}> = ({ item, partyState, isSelected, onSelect, onChange }) => {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ isWatchPartyEnabled: e.target.checked });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const localDate = new Date(e.target.value);
            onChange({ watchPartyStartTime: localDate.toISOString() });
        } else {
            onChange({ watchPartyStartTime: '' });
        }
    };

    const status = getPartyStatusText(item, partyState);

    return (
        <tr className="border-b border-gray-700">
            <td className="p-3 font-medium text-white">
                <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                        {item.type === 'movie' ? 'Single Film' : 'Stacked Block'}
                    </span>
                </div>
            </td>
            <td className="p-3">
                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>
                    {status.text}
                </span>
            </td>
            <td className="p-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={item.isWatchPartyEnabled || false} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-pink-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
            </td>
            <td className="p-3">
                <input
                    type="datetime-local"
                    value={formatISOForInput(item.watchPartyStartTime)}
                    onChange={handleTimeChange}
                    className="form-input !py-1 text-sm"
                    disabled={!item.isWatchPartyEnabled}
                />
            </td>
            <td className="p-3">
                <button 
                    onClick={onSelect}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                >
                    {isSelected ? 'In Control' : 'Control'}
                </button>
            </td>
        </tr>
    );
};


// --- MAIN COMPONENT ---

const WatchPartyManager: React.FC<{ 
    allMovies: Record<string, Movie>; 
    festivalData: FestivalDay[];
    crateFestConfig: CrateFestConfig | null;
    onSaveMovie: (movie: Movie) => Promise<void>; 
    onSaveFestival: (data: FestivalDay[]) => Promise<void>;
    onSaveCrateFest: (config: CrateFestConfig) => Promise<void>;
}> = ({ allMovies, festivalData, crateFestConfig, onSaveMovie, onSaveFestival, onSaveCrateFest }) => {
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [filter, setFilter] = useState('');
    const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
    const { user } = useAuth();

    // Local state for items to allow editing before saving
    const [localMovies, setLocalMovies] = useState<Record<string, Movie>>(allMovies);
    const [localFestivalData, setLocalFestivalData] = useState<FestivalDay[]>(festivalData);
    const [localCrateFestConfig, setLocalCrateFestConfig] = useState<CrateFestConfig | null>(crateFestConfig);

    useEffect(() => {
        setLocalMovies(allMovies);
        setLocalFestivalData(festivalData);
        setLocalCrateFestConfig(crateFestConfig);
    }, [allMovies, festivalData, crateFestConfig]);
    
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => {
                states[doc.id] = doc.data() as WatchPartyState;
            });
            setPartyStates(states);
        });
        return () => unsub();
    }, []);

    const watchableItems = useMemo(() => {
        const items: WatchableItem[] = [];

        // Add movies
        Object.values(localMovies).forEach(m => {
            items.push({
                id: m.key,
                title: m.title,
                type: 'movie',
                isWatchPartyEnabled: m.isWatchPartyEnabled,
                watchPartyStartTime: m.watchPartyStartTime,
                fullMovie: m.fullMovie
            });
        });

        // Add festival blocks
        localFestivalData.forEach(day => {
            day.blocks.forEach(block => {
                items.push({
                    id: block.id,
                    title: block.title,
                    type: 'block',
                    isWatchPartyEnabled: block.isWatchPartyEnabled,
                    watchPartyStartTime: block.watchPartyStartTime,
                    movieKeys: block.movieKeys
                });
            });
        });

        // Add Crate Fest blocks
        if (localCrateFestConfig?.movieBlocks) {
            localCrateFestConfig.movieBlocks.forEach(block => {
                items.push({
                    id: block.id,
                    title: block.title,
                    type: 'block',
                    isWatchPartyEnabled: block.isWatchPartyEnabled,
                    watchPartyStartTime: block.watchPartyStartTime,
                    movieKeys: block.movieKeys
                });
            });
        }

        return items;
    }, [localMovies, localFestivalData, localCrateFestConfig]);

    const currentSelectedItem = useMemo(() => {
        if (selectedItemKey) {
            return watchableItems.find(i => i.id === selectedItemKey) || null;
        }

        const now = new Date();
        const enabledItems = watchableItems
            .filter(i => i.isWatchPartyEnabled && i.watchPartyStartTime)
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        const liveOrWaiting = enabledItems.find(i => {
            const state = partyStates[i.id];
            const startTime = new Date(i.watchPartyStartTime!);
            return startTime <= now && (now.getTime() - startTime.getTime() < 4 * 60 * 60 * 1000);
        });

        if (liveOrWaiting) return liveOrWaiting;

        const nextUpcoming = enabledItems.find(i => new Date(i.watchPartyStartTime!) > now);
        return nextUpcoming || null;
    }, [watchableItems, partyStates, selectedItemKey]);

    const handleItemChange = (itemId: string, updates: Partial<WatchableItem>) => {
        // Find where this item belongs and update local state
        const movie = localMovies[itemId];
        if (movie) {
            setLocalMovies(prev => ({ ...prev, [itemId]: { ...prev[itemId], ...updates } }));
            return;
        }

        // Check festival data
        let foundFest = false;
        const newFestData = localFestivalData.map(day => ({
            ...day,
            blocks: day.blocks.map(block => {
                if (block.id === itemId) {
                    foundFest = true;
                    return { ...block, ...updates };
                }
                return block;
            })
        }));
        if (foundFest) {
            setLocalFestivalData(newFestData);
            return;
        }

        // Check crate fest config
        if (localCrateFestConfig) {
            let foundCrate = false;
            const newCrateBlocks = localCrateFestConfig.movieBlocks.map(block => {
                if (block.id === itemId) {
                    foundCrate = true;
                    return { ...block, ...updates };
                }
                return block;
            });
            if (foundCrate) {
                setLocalCrateFestConfig({ ...localCrateFestConfig, movieBlocks: newCrateBlocks });
            }
        }
    };
    
    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        
        try {
            // Save modified movies
            const changedMovies = Object.keys(localMovies).filter(key => 
                JSON.stringify(allMovies[key]) !== JSON.stringify(localMovies[key])
            ).map(key => localMovies[key]);
            
            // Save modified festival data
            const festChanged = JSON.stringify(festivalData) !== JSON.stringify(localFestivalData);
            
            // Save modified crate fest config
            const crateChanged = JSON.stringify(crateFestConfig) !== JSON.stringify(localCrateFestConfig);

            const promises: Promise<any>[] = [];
            changedMovies.forEach(m => promises.push(onSaveMovie(m)));
            if (festChanged) promises.push(onSaveFestival(localFestivalData));
            if (crateChanged && localCrateFestConfig) promises.push(onSaveCrateFest(localCrateFestConfig));

            await Promise.all(promises);
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
        if (!user || !currentSelectedItem) return;
        const db = getDbInstance();
        if (!db) return;

        const syncRef = db.collection('watch_parties').doc(currentSelectedItem.id);
        await syncRef.set({
            ...newState,
            type: currentSelectedItem.type,
            lastUpdatedBy: user.name || user.email,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }, [currentSelectedItem, user]);
    
    const handleStartParty = async () => {
        if (!currentSelectedItem) {
            alert("No item selected for control.");
            return;
        }
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            alert("Admin session expired. Please log in again.");
            return;
        }

        try {
            const response = await fetch('/api/start-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: currentSelectedItem.id, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to start party.');
            }
        } catch (error) {
            console.error("Start Party Error:", error);
            alert(`Error: Could not start the party. ${(error as Error).message}`);
        }
    };

    const handleTerminateParty = async () => {
        if (!currentSelectedItem) return;
        const password = sessionStorage.getItem('adminPassword');
        if (!password) return;

        if (!window.confirm("Are you sure you want to terminate this watch party? This will end the session for all viewers.")) return;

        try {
            const response = await fetch('/api/terminate-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: currentSelectedItem.id, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to terminate party.');
            }
        } catch (error) {
            console.error("Terminate Party Error:", error);
            alert(`Error: Could not terminate the party. ${(error as Error).message}`);
        }
    };

    const filteredItems = watchableItems
        .filter(item => item.title.toLowerCase().includes(filter.toLowerCase()))
        .filter(item => !showOnlyEnabled || item.isWatchPartyEnabled)
        .sort((a, b) => a.title.localeCompare(b.title));

    const hasUnsavedChanges = JSON.stringify(allMovies) !== JSON.stringify(localMovies) || 
                             JSON.stringify(festivalData) !== JSON.stringify(localFestivalData) || 
                             JSON.stringify(crateFestConfig) !== JSON.stringify(localCrateFestConfig);

    return (
        <>
            {currentSelectedItem && (
                <WatchPartyControlRoom
                    item={currentSelectedItem}
                    partyState={partyStates[currentSelectedItem.id]}
                    onStartParty={handleStartParty}
                    onTerminateParty={handleTerminateParty}
                    onSyncState={handleSyncState}
                    allMovies={allMovies}
                />
            )}

            <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-pink-400">Schedule a Watch Party</h2>
                <p className="text-sm text-gray-400 mb-6">Enable a party for a Single Film or a Stacked Block. Only one party can be active or upcoming at a time. Click "Save All Changes" to publish your schedule.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Filter movies or blocks..."
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
                                <th className="p-3">Title / Type</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Enabled</th>
                                <th className="p-3">Start Time</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <MovieRow 
                                    key={item.id} 
                                    item={item} 
                                    partyState={partyStates[item.id]}
                                    isSelected={currentSelectedItem?.id === item.id}
                                    onSelect={() => setSelectedItemKey(item.id)}
                                    onChange={(updates) => handleItemChange(item.id, updates)} 
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
