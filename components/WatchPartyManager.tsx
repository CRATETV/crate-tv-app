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
        <div className="w-full h-full flex flex-col bg-gray-900 border-l-2 border-gray-700">
            <div className="p-4 text-lg font-bold border-b border-gray-700 flex-shrink-0">
                <h2 className="text-base font-black uppercase tracking-widest text-gray-500">Event Audio/Text Feed</h2>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 p-1" dangerouslySetInnerHTML={{ __html: avatars[msg.userAvatar] || avatars['fox'] }} />
                        <div>
                            <p className="font-bold text-[10px] text-red-500 uppercase tracking-tighter">{msg.userName}</p>
                            <p className="text-sm text-gray-300 break-words">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex-shrink-0 bg-black/20">
                <div className="flex items-center gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Host message..." className="form-input flex-grow !bg-black/40 border-white/10" disabled={!user || isSending} />
                    <button type="submit" className="submit-btn !px-6 !py-2.5 text-xs" disabled={!user || isSending || !newMessage.trim()}>Send</button>
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
            video.play().catch(e => console.warn("Admin autoplay was prevented", e));
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
        alert(`Backstage Key updated to: ${backstageKey.trim().toUpperCase()}`);
    };
    
    const status = getPartyStatusText(movie, partyState);
    const canStart = movie.isWatchPartyEnabled && movie.watchPartyStartTime && new Date() >= new Date(movie.watchPartyStartTime) && (partyState?.status === 'waiting' || !partyState);

    return (
        <div className="mb-12 bg-black/60 p-8 rounded-[2.5rem] border border-red-600/30 shadow-[0_50px_100px_rgba(0,0,0,1)]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Event Control Station</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 text-[10px] font-black text-white rounded-full uppercase tracking-widest ${status.color}`}>
                            {status.text}
                        </span>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Active ID: {movie.key}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleShare} className="bg-white/5 hover:bg-white text-gray-400 hover:text-black font-black px-6 py-3 rounded-xl border border-white/10 transition-all uppercase text-[10px] tracking-widest">
                        {copyStatus === 'copied' ? 'Link Copied!' : 'Share Broadcast Link'}
                    </button>
                    <a href={shareUrl} target="_blank" className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-lg">
                        Go to Live View
                    </a>
                    {partyState?.status === 'live' && (
                        <button onClick={onEndParty} className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl">
                            End Session
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                        {partyState?.isQALive ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center bg-gray-950 p-8 space-y-6">
                                <div className="bg-red-600 p-4 rounded-full animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="text-xl font-black uppercase text-white tracking-tighter italic">Live Q&A Mode Active</h4>
                                <p className="text-gray-400 text-sm font-medium">Participants are now connecting to the Talkback Terminal.</p>
                                <button 
                                    onClick={() => onSyncState({ isQALive: false })}
                                    className="px-6 py-2 bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                    Cancel Talkback & Return to Film
                                </button>
                            </div>
                        ) : (
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
                        )}
                        <div className="absolute top-4 right-4 z-10">
                            <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Master Feed</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase mb-1">{movie.title}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    {movie.watchPartyStartTime ? `Synchronized Start: ${new Date(movie.watchPartyStartTime).toLocaleString()}` : 'No schedule set.'}
                                </p>
                            </div>
                            {partyState?.status === 'live' && !partyState.isQALive && (
                                <button 
                                    onClick={() => onSyncState({ isQALive: true, isPlaying: false })}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl transition-all"
                                >
                                    Initiate Live Q&A
                                </button>
                            )}
                        </div>
                        {canStart && (
                            <button onClick={onStartParty} className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                                Establish Live Handshake (Start Party)
                            </button>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 h-full min-h-[400px]">
                     <EmbeddedChat movieKey={movie.key} user={user} />
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-[2rem] space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Manual Guest Authorization</h4>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={backstageKey} 
                                    onChange={e => setBackstageKey(e.target.value)} 
                                    placeholder="Set Access Key" 
                                    className="form-input !bg-black/40 border-white/10 uppercase font-mono text-xs"
                                />
                                <button onClick={handleUpdateBackstageKey} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Sync</button>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-2 italic">Give this key to guests who don't have a creator profile to grant them camera access.</p>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Event Vouchers</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-4">Generate VIP invitations for stakeholders to bypass the paywall during this live event.</p>
                            <PromoCodeManager 
                                isAdmin={true} 
                                defaultItemId={movie.key}
                                targetFilms={[movie]}
                            />
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
        <tr className="border-b border-gray-700">
            <td className="p-3 font-medium text-white">{movie.title}</td>
            <td className="p-3">
                <span className={`px-2 py-1 text-[10px] font-black text-white rounded-full uppercase tracking-widest ${status.color}`}>
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
                    className="form-input !py-1 text-sm bg-black/40 border-white/10"
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
        if (!currentPartyMovie || !window.confirm("This will kill the live session for everyone. Are you sure?")) return;
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
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Event Scheduler</h2>
                        <p className="text-sm text-gray-500 mt-1">Map films to live synchronized sessions.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Filter manifest..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="form-input !bg-white/5 border-white/10 flex-grow text-xs"
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
                    <table className="w-full text-left text-xs">
                        <thead className="text-gray-500 font-black uppercase tracking-widest bg-black/40">
                            <tr>
                                <th className="p-4">Manifest Record</th>
                                <th className="p-4">Logic State</th>
                                <th className="p-4">Active</th>
                                <th className="p-4">Start Time (Local)</th>
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