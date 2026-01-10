import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

// --- HELPER FUNCTIONS ---

const getPartyStatusText = (movie: Movie, partyState?: WatchPartyState) => {
    if (!movie.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return { text: 'Not Scheduled', color: 'bg-gray-500' };
    }
    
    if (partyState?.status === 'live') {
        return { text: 'LIVE NOW', color: 'bg-red-600 animate-pulse' };
    }

    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    
    if (now < startTime) {
        return { text: 'Scheduled', color: 'bg-blue-500' };
    }
    
    if (partyState?.status === 'waiting' || (!partyState?.status && now >= startTime)) {
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
        const messagesRef = db.collection('watch_parties').doc(movieKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(200);
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
        <div className="w-full h-full flex flex-col bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 flex-shrink-0">
                Live Dispatch Feed
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 p-1 border border-white/10" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div className="min-w-0">
                            <p className="font-black text-[10px] text-red-500 uppercase tracking-tighter">{msg.userName}</p>
                            <p className="text-sm text-gray-200 break-words leading-tight">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 border border-white/10 focus-within:border-red-600 transition-colors">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send message..." className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-3" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500" disabled={!user || isSending || !newMessage.trim()}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
};

const WatchPartyControlRoom: React.FC<{
    movie: Movie;
    partyState: WatchPartyState | undefined;
    onStartParty: () => void;
    onEndParty: () => void;
    onSyncState: (state: Partial<WatchPartyState>) => void;
}> = ({ movie, partyState, onStartParty, onEndParty, onSyncState }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    const lastSyncTime = useRef(0);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePlay = () => onSyncState({ isPlaying: true });
    const handlePause = () => videoRef.current && onSyncState({ isPlaying: false, currentTime: videoRef.current.currentTime });
    const handleSeeked = () => videoRef.current && onSyncState({ currentTime: videoRef.current.currentTime });
    
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
    const isLive = partyState?.status === 'live';
    const canStart = movie.isWatchPartyEnabled && movie.watchPartyStartTime && new Date() >= new Date(movie.watchPartyStartTime) && !isLive;

    const toggleQA = () => {
        const nextQA = !partyState?.isQALive;
        const updates: Partial<WatchPartyState> = { isQALive: nextQA };
        if (nextQA && !partyState?.backstageKey) {
            updates.backstageKey = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        onSyncState(updates);
    };

    const handleDownloadChat = async () => {
        setIsDownloading(true);
        const db = getDbInstance();
        if (!db) return;
        
        try {
            const snap = await db.collection('watch_parties').doc(movie.key).collection('messages').orderBy('timestamp', 'asc').get();
            let log = `CHAT LOG: ${movie.title}\nDATE: ${new Date().toLocaleString()}\n--------------------------------\n\n`;
            
            snap.forEach(doc => {
                const data = doc.data();
                const time = data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000).toLocaleString() : '---';
                log += `[${time}] ${data.userName}: ${data.text}\n`;
            });
            
            const blob = new Blob([log], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CHAT_LOG_${movie.title.replace(/\s+/g, '_')}_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Log extraction failed.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="mb-12 bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Operational Hub: {movie.title}</h2>
                    <div className="flex items-center gap-4 mt-2">
                         <span className={`px-3 py-1 text-[9px] font-black text-white rounded-full uppercase tracking-widest ${status.color}`}>
                            {status.text}
                        </span>
                        <button 
                            onClick={handleDownloadChat} 
                            disabled={isDownloading}
                            className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {isDownloading ? 'Extracting...' : 'Download Chat Log'}
                        </button>
                    </div>
                </div>
                <div className="flex gap-3">
                    {canStart && (
                        <button onClick={onStartParty} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-xs">
                            Initialize Session
                        </button>
                    )}
                    {isLive && (
                        <button onClick={onEndParty} className="bg-white/10 hover:bg-red-600 text-gray-400 hover:text-white font-black py-4 px-10 rounded-2xl uppercase tracking-[0.2em] border border-white/10 transition-all text-xs">
                            Terminate Session
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="relative aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
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
                         <div className="absolute top-4 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-red-500 uppercase tracking-widest">Master Feed</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-6 rounded-3xl border transition-all cursor-pointer ${partyState?.isQALive ? 'bg-indigo-600/10 border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'bg-white/5 border-white/10 opacity-50'}`} onClick={toggleQA}>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Live Q&A Module</h4>
                                <div className={`w-3 h-3 rounded-full ${partyState?.isQALive ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Synchronizes the talkback terminal for all users on the Watch Party page.</p>
                        </div>

                        {partyState?.isQALive && (
                            <div className="p-6 rounded-3xl bg-black border border-white/10 space-y-3 animate-[fadeIn_0.3s_ease-out]">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Backstage Access Key</p>
                                <div className="flex items-center justify-between">
                                    <code className="text-2xl font-black text-indigo-400 tracking-[0.2em]">{partyState.backstageKey}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(partyState.backstageKey || ''); alert('Copied!'); }} className="text-gray-600 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg></button>
                                </div>
                                <p className="text-[8px] text-gray-700 uppercase font-black tracking-widest">Send this key to the Guest Creator (Director/Actor) to unlock their stage camera.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1 h-[60vh] lg:h-auto">
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
        const tzoffset = date.getTimezoneOffset() * 60000;
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

    const handlePaidToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ isWatchPartyPaid: e.target.checked });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ watchPartyPrice: parseFloat(e.target.value) || 5.00 });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const localDate = new Date(e.target.value);
            onChange({ watchPartyStartTime: localDate.toISOString() });
        } else {
            onChange({ watchPartyStartTime: '' });
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/watchparty/${movie.key}`;
        navigator.clipboard.writeText(url);
        alert('Public Watch Party link copied!');
    };

    const status = getPartyStatusText(movie, partyState);

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
            <td className="p-4">
                <div className="flex items-center gap-4">
                    <img src={movie.poster} className="w-10 h-14 object-cover rounded shadow-lg opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                    <div className="min-w-0">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-white uppercase text-sm truncate max-w-[200px]">{movie.title}</span>
                             {movie.isWatchPartyEnabled && (
                                <button onClick={handleCopyLink} className="text-gray-700 hover:text-white transition-colors" title="Copy Public Link">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                </button>
                            )}
                        </div>
                        <span className={`px-2 py-0.5 text-[7px] font-black text-white rounded-full uppercase tracking-widest ${status.color} mt-1 inline-block`}>
                            {status.text}
                        </span>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </td>
            <td className="p-4">
                 <div className="flex flex-col gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={movie.isWatchPartyPaid || false} onChange={handlePaidToggle} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-pink-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        <span className="ml-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Paid Entry</span>
                    </label>
                    {movie.isWatchPartyPaid && (
                        <div className="flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
                             <span className="text-pink-500 font-black text-xs">$</span>
                             <input 
                                type="number" 
                                value={movie.watchPartyPrice} 
                                onChange={handlePriceChange}
                                className="form-input !py-1 !px-2 !w-20 text-xs bg-black border-white/10 text-pink-500 font-bold" 
                                step="0.50"
                             />
                        </div>
                    )}
                 </div>
            </td>
            <td className="p-4">
                <input
                    type="datetime-local"
                    value={formatISOForInput(movie.watchPartyStartTime)}
                    onChange={handleTimeChange}
                    className="form-input !py-2 text-[10px] bg-black/40 border-white/10"
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
        const unsub = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => {
                states[doc.id] = doc.data() as WatchPartyState;
            });
            setPartyStates(states);
        });
        return () => unsub();
    }, []);

    const currentPartyMovie = useMemo(() => {
        const enabledMovies = (Object.values(movieSettings) as Movie[])
            .filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime)
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        const liveParty = enabledMovies.find(m => partyStates[m.key]?.status === 'live');
        if (liveParty) return liveParty;

        const now = new Date();
        const nextWaitingOrUpcoming = enabledMovies.find(m => {
            const startTime = new Date(m.watchPartyStartTime!);
            return startTime <= now || (startTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000);
        });

        return nextWaitingOrUpcoming || null;
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

    const handleEndParty = async () => {
        if (!currentPartyMovie || !window.confirm("Terminate this session and remove the banner globally?")) return;
        await handleSyncState({ status: 'ended', isPlaying: false });
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(movie => (movie.title || '').toLowerCase().includes(filter.toLowerCase()))
        .filter(movie => !showOnlyEnabled || movieSettings[movie.key]?.isWatchPartyEnabled)
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return (
        <div className="space-y-12">
            {currentPartyMovie && (
                <WatchPartyControlRoom
                    movie={currentPartyMovie}
                    partyState={partyStates[currentPartyMovie.key]}
                    onStartParty={handleStartParty}
                    onEndParty={handleEndParty}
                    onSyncState={handleSyncState}
                />
            )}

            <div className="bg-[#0f0f0f] p-8 md:p-12 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Event Logistics Manifest</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-2">Manage the global watch party schedule and entry logic.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6">
                    <input
                        type="text"
                        placeholder="Filter films..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="form-input !bg-black/40 border-white/10 flex-grow"
                    />
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Only</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={showOnlyEnabled} onChange={e => setShowOnlyEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>
                </div>
                
                <div className="bg-black border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <tr>
                                    <th className="p-5">Film Identity</th>
                                    <th className="p-5">Scheduling</th>
                                    <th className="p-5">Entry Logic</th>
                                    <th className="p-5">Sync Window</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredMovies.length === 0 ? (
                                    <tr><td colSpan={4} className="p-12 text-center text-gray-600 font-black uppercase">No records found</td></tr>
                                ) : filteredMovies.map(movie => (
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
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Changes are held in cache until global push.</p>
                    <div className="flex items-center gap-6">
                        {saveStatus === 'success' && <span className="text-green-500 text-xs font-black uppercase tracking-widest animate-pulse">✓ Sync Complete</span>}
                        {saveStatus === 'error' && <span className="text-red-500 text-xs font-black uppercase tracking-widest">⚠️ Sync Failed</span>}
                        <button
                            onClick={handleSaveAll}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black py-5 px-12 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95"
                        >
                            {isSaving ? 'Processing Cluster...' : 'Commit All Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPartyManager;