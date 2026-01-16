
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage, FilmBlock } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { avatars } from './avatars';

const getPartyStatusText = (movie: Movie, partyState?: WatchPartyState) => {
    if (partyState?.status === 'live') {
        return { text: 'LIVE NOW', color: 'bg-red-600 animate-pulse' };
    }
    if (!movie.isWatchPartyEnabled || !movie.watchPartyStartTime) {
        return { text: 'Disabled', color: 'bg-gray-800 text-gray-500' };
    }
    const now = new Date();
    const startTime = new Date(movie.watchPartyStartTime);
    if (now < startTime) {
        return { text: 'Upcoming', color: 'bg-indigo-600' };
    }
    return { text: 'Session Inactive', color: 'bg-gray-700' };
};

interface EmbeddedChatProps {
    movieKey: string; 
    user: { name?: string; email: string | null; avatar?: string; } | null;
    movie?: Movie; 
}

const EmbeddedChat: React.FC<EmbeddedChatProps> = ({ movieKey, user, movie }: EmbeddedChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const directorsList = useMemo(() => 
        (movie?.director || '').toLowerCase().split(',').map(d => d.trim()), 
    [movie?.director]);

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
                Live Dispatch Feed {movie && `// ${movie.title}`}
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
    blockInfo?: FilmBlock;
    onEndParty: () => void;
    onSyncState: (state: Partial<WatchPartyState>) => void;
}> = ({ movie, partyState, blockInfo, onEndParty, onSyncState }) => {
    const { user } = useAuth();
    const [isCopying, setIsCopying] = useState(false);

    const handleCopyBackstageInvite = () => {
        if (!partyState?.backstageKey) return;
        setIsCopying(true);
        const url = `${window.location.origin}/watchparty/${movie.key}`;
        const msg = `Hello! You are invited to the Backstage Talkback for "${movie.title}".\n\nLink: ${url}\nAccess Key: ${partyState.backstageKey}\n\nPlease enter the key when prompted to activate your broadcast node.`;
        navigator.clipboard.writeText(msg);
        setTimeout(() => setIsCopying(false), 2000);
    };
    
    const status = getPartyStatusText(movie, partyState);
    const isLive = partyState?.status === 'live';

    return (
        <div className="bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl mb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <img src={movie.poster} className="w-16 h-24 object-cover rounded-xl shadow-xl border border-white/10" alt="" />
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Live Monitor: {movie.title}</h2>
                        <div className="flex items-center gap-4 mt-3">
                            <span className={`px-3 py-1 text-[9px] font-black text-white rounded-full uppercase tracking-widest ${status.color}`}>
                                {status.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {isLive && (
                        <>
                            <button 
                                onClick={handleCopyBackstageInvite}
                                className={`px-6 py-4 rounded-2xl uppercase font-black text-[10px] tracking-widest transition-all flex items-center gap-2 ${isCopying ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400 border border-white/10 hover:text-white'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                {isCopying ? 'Invite Copied ✓' : 'Invite Guest Backstage'}
                            </button>
                            <button onClick={onEndParty} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-xs">
                                Terminate Session
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                     <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                         <div className="text-center space-y-4">
                            <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Global Sync Monitor Active</p>
                            <h3 className="text-white font-black text-2xl uppercase italic">Session Streaming Globally</h3>
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Strict synchronization protocol enforced by server-time offset.</p>
                         </div>
                     </div>
                </div>
                <div className="lg:col-span-1 h-[60vh] lg:h-auto">
                     <EmbeddedChat movieKey={movie.key} movie={movie} user={user} />
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

const WatchPartyManager: React.FC<{ allMovies: Record<string, Movie>; onSave: (movie: Movie) => Promise<void>; }> = ({ allMovies, onSave }) => {
    const { festivalData, settings } = useFestival();
    const { user } = useAuth();
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [activeTab, setActiveTab] = useState<'calendar' | 'access'>('calendar');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('watch_parties').onSnapshot(snapshot => {
            const states: Record<string, WatchPartyState> = {};
            snapshot.forEach(doc => { states[doc.id] = doc.data() as WatchPartyState; });
            setPartyStates(states);
        });
        return () => unsub();
    }, []);

    const activeParty = useMemo(() => {
        const liveKey = Object.keys(partyStates).find(key => partyStates[key].status === 'live');
        if (!liveKey) return null;
        const state = partyStates[liveKey];
        const movie = allMovies[liveKey];
        if (!movie) return null;
        return { movie, state };
    }, [partyStates, allMovies]);

    const handleSyncState = useCallback(async (movieKey: string, newState: Partial<WatchPartyState>) => {
        const db = getDbInstance();
        if (!db) return;
        await db.collection('watch_parties').doc(movieKey).set({
            ...newState,
            lastUpdatedBy: user?.name || user?.email,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }, [user]);

    const handleEndParty = async () => {
        if (!activeParty) return;
        await handleSyncState(activeParty.movie.key, { status: 'ended', isPlaying: false });
    };

    const handleScheduleChange = async (movieKey: string, startTime: string) => {
        const movie = allMovies[movieKey];
        if (!movie) return;
        const utcTime = startTime ? new Date(startTime).toISOString() : '';
        await onSave({ ...movie, watchPartyStartTime: utcTime });
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => m.title.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
            if (a.watchPartyStartTime && !b.watchPartyStartTime) return -1;
            if (!a.watchPartyStartTime && b.watchPartyStartTime) return 1;
            return a.title.localeCompare(b.title);
        });

    return (
        <div className="space-y-8 pb-32">
            {activeParty && (
                <WatchPartyControlRoom
                    movie={activeParty.movie}
                    partyState={activeParty.state}
                    onEndParty={handleEndParty}
                    onSyncState={(s) => handleSyncState(activeParty.movie.key, s)}
                />
            )}

            <div className="flex justify-center mb-12">
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-1 shadow-2xl inline-flex">
                    <button onClick={() => setActiveTab('calendar')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Watch Calendar</button>
                    <button onClick={() => setActiveTab('access')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'access' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>Payout Keys</button>
                </div>
            </div>

            {activeTab === 'access' && <PayoutKeyForge movies={allMovies} />}

            {activeTab === 'calendar' && (
                <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex flex-col sm:flex-row justify-between gap-6 mb-12 items-center">
                        <div>
                             <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white">Event Scheduling Manifest</h3>
                             <p className="text-gray-500 text-[10px] font-black uppercase mt-1 tracking-widest">Automatic global sync activates at scheduled timestamp.</p>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Scan manifest..." 
                            value={filter} 
                            onChange={e => setFilter(e.target.value)} 
                            className="form-input !py-3 !px-6 text-xs max-w-sm bg-black/40 border-white/10"
                        />
                    </div>
                    
                    <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-white/5 text-gray-500 uppercase font-black">
                                    <tr>
                                        <th className="p-6">Cinematic Node</th>
                                        <th className="p-6">Live Status</th>
                                        <th className="p-6">Enabled</th>
                                        <th className="p-6 text-right">Scheduled Start (Local)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredMovies.map(movie => (
                                        <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <img src={movie.poster} className="w-10 h-14 object-cover rounded-xl shadow-lg border border-white/10" alt="" />
                                                    <div>
                                                        <p className="font-black text-white uppercase tracking-tight text-sm">{movie.title}</p>
                                                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Dir. {movie.director}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current opacity-70 ${getPartyStatusText(movie, partyStates[movie.key]).color.replace('bg-', 'text-')}`}>
                                                    {getPartyStatusText(movie, partyStates[movie.key]).text}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={e => onSave({ ...movie, isWatchPartyEnabled: e.target.checked })} className="sr-only peer" />
                                                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </label>
                                            </td>
                                            <td className="p-6 text-right">
                                                <input
                                                    type="datetime-local"
                                                    value={formatISOForInput(movie.watchPartyStartTime)}
                                                    onChange={e => handleScheduleChange(movie.key, e.target.value)}
                                                    className={`form-input !py-2 !px-4 text-xs bg-black/40 border-white/10 w-64 text-right transition-all ${movie.watchPartyStartTime ? 'text-indigo-400 border-indigo-500/30' : 'text-gray-700'}`}
                                                    disabled={!movie.isWatchPartyEnabled}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PayoutKeyForge: React.FC<{ movies: Record<string, Movie> }> = ({ movies }) => {
    const [selectedDirector, setSelectedDirector] = useState('');
    const [scope, setScope] = useState<'WATCH_PARTY' | 'FESTIVAL'>('WATCH_PARTY');
    const [generatedKey, setGeneratedKey] = useState('');
    const [isForging, setIsForging] = useState(false);

    const directors = useMemo(() => {
        const set = new Set<string>();
        (Object.values(movies) as Movie[]).forEach(m => {
            if (m.director) m.director.split(',').forEach(d => set.add(d.trim()));
        });
        return Array.from(set).sort();
    }, [movies]);

    const forgeKey = async () => {
        if (!selectedDirector) return;
        setIsForging(true);
        const accessKey = `PAY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        try {
            const db = getDbInstance();
            if (db) {
                await db.collection('director_payout_keys').add({
                    directorName: selectedDirector,
                    accessKey,
                    scope,
                    status: 'ACTIVE',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                setGeneratedKey(accessKey);
            }
        } catch (e) {
            alert("Forge failure.");
        } finally {
            setIsForging(false);
        }
    };

    return (
        <div className="bg-[#0f0f0f] border border-indigo-500/20 p-8 rounded-[3rem] shadow-2xl space-y-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Disbursement Forge</h3>
                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1">Single-use access keys for verified creators.</p>
                </div>
                <div className="flex gap-2 p-1 bg-black rounded-xl border border-white/5">
                    <button onClick={() => setScope('WATCH_PARTY')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scope === 'WATCH_PARTY' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Watch Party</button>
                    <button onClick={() => setScope('FESTIVAL')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scope === 'FESTIVAL' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Full Festival</button>
                </div>
            </div>
            
            <div className="space-y-4">
                <select 
                    value={selectedDirector} 
                    onChange={e => { setSelectedDirector(e.target.value); setGeneratedKey(''); }}
                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-600 outline-none"
                >
                    <option value="">Select Target Creator...</option>
                    {directors.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {generatedKey ? (
                    <div className="p-10 bg-green-600/10 border border-green-500/30 rounded-3xl text-center space-y-6 animate-[fadeIn_0.3s_ease-out]">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Single-Use Node: {scope}</p>
                        <p className="text-5xl font-black text-white tracking-[0.2em] select-all">{generatedKey}</p>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(generatedKey); alert('Key Copied.'); }}
                            className="bg-white text-black font-black px-10 py-3 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Copy Key
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={forgeKey}
                        disabled={isForging || !selectedDirector}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-xl transition-all disabled:opacity-20 active:scale-95"
                    >
                        {isForging ? 'Synthesizing Access Node...' : 'Initialize Payout Terminal'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WatchPartyManager;
