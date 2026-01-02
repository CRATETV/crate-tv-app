import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';
import PromoCodeManager from './PromoCodeManager';

// --- HELPER FUNCTIONS ---

const getPartyStatusText = (movie: Movie, partyState?: WatchPartyState) => {
    if (!movie.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return { text: 'OFFLINE', color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    if (now < startTime) {
        return { text: 'SCHEDULED', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    }
    if (partyState?.status === 'live') {
        return { text: 'ON AIR', color: 'text-red-500', bg: 'bg-red-500/10' };
    }
    if (partyState?.status === 'waiting') {
        return { text: 'READY', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    }
    return { text: 'ARCHIVED', color: 'text-gray-600', bg: 'bg-gray-800' };
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
        <div className="w-full h-full flex flex-col bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-inner">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Live Pulse Monitor</h2>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-800 flex-shrink-0 p-1 border border-white/5" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div>
                            <p className="font-bold text-[9px] text-red-500 uppercase tracking-tighter">{msg.userName}</p>
                            <p className="text-xs text-gray-300 break-words leading-snug">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-black/40">
                <div className="flex items-center gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send as Admin..." className="bg-transparent border-none text-xs w-full focus:ring-0 placeholder-gray-700" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500 hover:text-red-400 p-1" disabled={!user || isSending || !newMessage.trim()}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
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
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [backstageKey, setBackstageKey] = useState(partyState?.backstageKey || '');
    const lastSyncTime = useRef(0);

    const shareUrl = `${window.location.origin}/watchparty/${movie.key}`;

    const handleShare = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

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
            video.play().catch(e => console.warn("Admin autoplay prevented", e));
        } else if (!partyState.isPlaying && !video.paused) {
            video.pause();
        }

        if (Math.abs(video.currentTime - partyState.currentTime) > 3) {
            video.currentTime = partyState.currentTime;
        }
        
        if (partyState.backstageKey) setBackstageKey(partyState.backstageKey);
    }, [partyState]);

    const handleUpdateBackstageKey = () => {
        onSyncState({ backstageKey: backstageKey.trim().toUpperCase() });
        alert(`Backstage Key synced.`);
    };
    
    const status = getPartyStatusText(movie, partyState);
    const canStart = movie.isWatchPartyEnabled && movie.watchPartyStartTime && new Date() >= new Date(movie.watchPartyStartTime) && (partyState?.status === 'waiting' || !partyState);

    return (
        <div className="mb-12 bg-gray-900/60 p-4 md:p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] pointer-events-none"></div>
            
            {/* TOP COMMAND STRIP */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-1">Active Manifest</p>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">{movie.title}</h2>
                    </div>
                    <div className={`${status.bg} px-3 py-1 rounded-full border border-white/5`}>
                         <span className={`text-[9px] font-black uppercase tracking-widest ${status.color}`}>● {status.text}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={handleShare} className="flex-1 md:flex-none bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-5 py-2.5 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all">
                        {copyStatus === 'copied' ? 'Copied Link' : 'Copy Broadcast'}
                    </button>
                    <a href={shareUrl} target="_blank" className="flex-1 md:flex-none bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all text-center">
                        Launch View
                    </a>
                    {partyState?.status === 'live' && (
                        <button onClick={onEndParty} className="bg-red-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                            Kill Session
                        </button>
                    )}
                </div>
            </div>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* PREVIEW MONITOR */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                        {partyState?.isQALive ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center bg-gray-950 p-6 space-y-4">
                                <div className="bg-indigo-600 p-3 rounded-full animate-pulse shadow-lg">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="text-sm font-black uppercase text-indigo-400 tracking-widest">Talkback Active</h4>
                                <button onClick={() => onSyncState({ isQALive: false })} className="text-[8px] font-black uppercase text-gray-500 hover:text-white underline">End Stage Session</button>
                            </div>
                        ) : (
                            <video ref={videoRef} src={movie.fullMovie} onPlay={handlePlay} onPause={handlePause} onSeeked={handleSeeked} onTimeUpdate={handleTimeUpdate} controls className="w-full h-full" />
                        )}
                        <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] border border-white/10">Master Feed Monitor</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {canStart && (
                            <button onClick={onStartParty} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-green-900/20 active:scale-95 transition-all">
                                Establish Handshake (Go Live)
                            </button>
                        )}
                        {partyState?.status === 'live' && !partyState.isQALive && (
                            <button onClick={() => onSyncState({ isQALive: true, isPlaying: false })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/20 transition-all">
                                Initiate Live Q&A Stage
                            </button>
                        )}
                    </div>
                </div>

                {/* CHAT PULSE */}
                <div className="lg:col-span-3 h-[300px] lg:h-auto">
                    <EmbeddedChat movieKey={movie.key} user={user} />
                </div>

                {/* ACCESS LOGISTICS */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] h-full flex flex-col justify-between">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Guest Uplink Protocol</h4>
                                <div className="flex gap-2">
                                    <input type="text" value={backstageKey} onChange={e => setBackstageKey(e.target.value)} placeholder="Access Key" className="form-input !bg-black/40 border-white/5 uppercase font-mono text-xs py-2" />
                                    <button onClick={handleUpdateBackstageKey} className="bg-white/10 hover:bg-white text-gray-500 hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-colors">Sync</button>
                                </div>
                                <p className="text-[8px] text-gray-600 mt-3 italic leading-snug">Grant camera permissions to guests without profiles using this one-time session key.</p>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Digital Invitations</h4>
                                <PromoCodeManager isAdmin={true} defaultItemId={movie.key} targetFilms={[movie]} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const formatISOForInput = (isoString?: string): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};


const MovieRow: React.FC<{ movie: Movie; partyState?: WatchPartyState; onChange: (updates: Partial<Movie>) => void; }> = ({ movie, partyState, onChange }) => {
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

    const status = getPartyStatusText(movie, partyState);

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
            <td className="p-4">
                <span className="font-bold text-white uppercase text-xs tracking-tight group-hover:text-red-500 transition-colors">{movie.title}</span>
            </td>
            <td className="p-4">
                <div className={`${status.bg} px-2 py-0.5 rounded-full inline-block border border-white/5`}>
                     <span className={`text-[8px] font-black uppercase tracking-widest ${status.color}`}>{status.text}</span>
                </div>
            </td>
            <td className="p-4">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={handleToggle} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </td>
            <td className="p-4">
                <input
                    type="datetime-local"
                    value={formatISOForInput(movie.watchPartyStartTime)}
                    onChange={handleTimeChange}
                    className="bg-white/5 border border-white/5 rounded-lg py-1 px-3 text-[10px] font-black text-gray-400 focus:outline-none focus:border-red-600"
                    disabled={!movie.isWatchPartyEnabled}
                />
            </td>
        </tr>
    );
};


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
        const now = new Date();
        const enabledMovies = (Object.values(movieSettings) as Movie[])
            .filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime)
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        const liveOrWaiting = enabledMovies.find(m => {
            const state = partyStates[m.key];
            const startTime = new Date(m.watchPartyStartTime!);
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
            if (!response.ok) throw new Error((await response.json()).error || 'Failed');
        } catch (error) {}
    };

    const handleEndParty = async () => {
        if (!currentPartyMovie || !window.confirm("End session for all users?")) return;
        const db = getDbInstance();
        if (!db) return;
        await db.collection('watch_parties').doc(currentPartyMovie.key).set({ status: 'ended', isPlaying: false, isQALive: false }, { merge: true });
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

            <div className="bg-[#0f0f0f] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Event Scheduler</h2>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">Map manifest records to synchronized sessions.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Filter Manifest..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-400 focus:outline-none focus:border-red-600 transition-all"
                        />
                        <button
                            onClick={handleSaveAll}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black py-2.5 px-8 rounded-xl uppercase text-[10px] tracking-widest shadow-xl transition-all"
                        >
                            {isSaving ? 'Syncing...' : 'Commit Changes'}
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                        <thead className="text-gray-500 font-black uppercase tracking-widest bg-white/[0.02]">
                            <tr>
                                <th className="p-4">Record Identity</th>
                                <th className="p-4">Sync Logic</th>
                                <th className="p-4">Enabled</th>
                                <th className="p-4">Session Window (Local)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
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
            </div>
        </div>
    );
};

export default WatchPartyManager;