
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Movie, WatchPartyState, ChatMessage, FilmBlock } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import { avatars } from './avatars';

const getPartyStatusText = (entity: any, partyState?: WatchPartyState) => {
    if (partyState?.status === 'live') {
        return { text: 'LIVE NOW', color: 'bg-red-600 animate-pulse' };
    }
    const now = new Date();
    const startTimeStr = entity.watchPartyStartTime;
    if (!entity.isWatchPartyEnabled || !startTimeStr) {
        return { text: 'Disabled', color: 'bg-gray-800 text-gray-500' };
    }
    const startTime = new Date(startTimeStr);
    if (now < startTime) {
        return { text: 'Upcoming', color: 'bg-indigo-600' };
    }
    return { text: 'Session Inactive', color: 'bg-gray-700' };
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
            <div className="p-4 text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 flex-shrink-0">Live Feed Monitor</div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
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
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 border border-white/10">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send as admin..." className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-3" disabled={!user || isSending} />
                    <button type="submit" className="text-red-500" disabled={!user || isSending || !newMessage.trim()}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                </div>
            </form>
        </div>
    );
};

const WatchPartyControlRoom: React.FC<{
    entity: any;
    partyKey: string;
    partyState: WatchPartyState | undefined;
    onEndParty: () => void;
}> = ({ entity, partyKey, partyState, onEndParty }) => {
    const isLive = partyState?.status === 'live';
    const { user } = useAuth();

    return (
        <div className="bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl mb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Command: {entity.title}</h2>
                    <div className="flex items-center gap-4 mt-3">
                        <span className={`px-3 py-1 text-[9px] font-black text-white rounded-full uppercase tracking-widest ${getPartyStatusText(entity, partyState).color}`}>
                            {getPartyStatusText(entity, partyState).text}
                        </span>
                        {isLive && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Global Sync Active</span>}
                    </div>
                </div>
                <div className="flex gap-4">
                    {isLive && (
                        <button onClick={onEndParty} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-xs shadow-2xl">
                            Terminate Session
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative flex items-center justify-center text-center p-12">
                         <div className="space-y-4 opacity-50">
                            <svg className="w-12 h-12 mx-auto text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Monitoring Disengaged</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Streaming globally to authenticated user nodes</p>
                         </div>
                    </div>
                </div>
                <div className="lg:col-span-1 h-[50vh] lg:h-auto">
                    <EmbeddedChat movieKey={partyKey} user={user} />
                </div>
            </div>
        </div>
    );
};

const WatchPartyManager: React.FC<{ allMovies: Record<string, Movie>; onSave: (movie: Movie) => Promise<void>; }> = ({ allMovies, onSave }) => {
    const { festivalData, refreshData } = useFestival();
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
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
        const movie = allMovies[liveKey];
        const block = festivalData.flatMap(d => d.blocks).find(b => b.id === liveKey);
        if (!movie && !block) return null;
        return { entity: movie || block, partyKey: liveKey, state: partyStates[liveKey] };
    }, [partyStates, allMovies, festivalData]);

    const handleEndParty = async () => {
        if (!activeParty) return;
        const db = getDbInstance();
        if (db) {
            await db.collection('watch_parties').doc(activeParty.partyKey).update({ 
                status: 'ended', isPlaying: false, lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    };

    const handleUpdate = async (key: string, startTime: string, enabled: boolean, isBlock = false) => {
        const utcTime = startTime ? new Date(startTime).toISOString() : '';
        if (isBlock) {
            const db = getDbInstance();
            if (db) {
                const dayRef = festivalData.find(d => d.blocks.some(b => b.id === key));
                if (dayRef) {
                    const updatedBlocks = dayRef.blocks.map(b => b.id === key ? { ...b, watchPartyStartTime: utcTime, isWatchPartyEnabled: enabled } : b);
                    await db.collection('festival').doc('schedule').collection('days').doc(`day_${dayRef.day}`).update({ blocks: updatedBlocks });
                    await refreshData();
                }
            }
        } else {
            const movie = allMovies[key];
            if (movie) await onSave({ ...movie, watchPartyStartTime: utcTime, isWatchPartyEnabled: enabled });
        }
    };

    const handleManualStart = async (key: string) => {
        if (!window.confirm("Initialize manual start protocol?")) return;
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/start-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: key, password }),
            });
            if (res.ok) alert("Session is LIVE.");
        } catch (e) { alert("Initialization failure."); }
    };

    const allBlocks = useMemo(() => festivalData.flatMap(d => d.blocks), [festivalData]);
    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => m.title.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-8 pb-32">
            {activeParty && (
                <WatchPartyControlRoom
                    entity={activeParty.entity}
                    partyKey={activeParty.partyKey}
                    partyState={activeParty.state}
                    onEndParty={handleEndParty}
                />
            )}

            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Watch Schedule</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Configure automated start times. Row state is isolated to prevent reset during typing.</p>
                    </div>
                    <input type="text" placeholder="Filter manifest..." value={filter} onChange={e => setFilter(e.target.value)} className="form-input !py-3 text-xs bg-black/40 border-white/10 w-full md:w-64" />
                </div>

                <div className="bg-black border border-white/10 rounded-3xl overflow-hidden">
                     <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-500 uppercase font-black">
                            <tr>
                                <th className="p-6">Node</th>
                                <th className="p-6">Status</th>
                                <th className="p-6">Auto-Start</th>
                                <th className="p-6">Target Window (Local)</th>
                                <th className="p-6 text-right">Commit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allBlocks.map(block => (
                                <PartyRow key={block.id} entity={block} partyState={partyStates[block.id]} isBlock={true} onUpdate={handleUpdate} onManualStart={handleManualStart} />
                            ))}
                            {filteredMovies.map(movie => (
                                <PartyRow key={movie.key} entity={movie} partyState={partyStates[movie.key]} isBlock={false} onUpdate={handleUpdate} onManualStart={handleManualStart} />
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>
        </div>
    );
};

const PartyRow: React.FC<{ 
    entity: any; 
    partyState?: WatchPartyState; 
    isBlock: boolean; 
    onUpdate: (key: string, time: string, enabled: boolean, isBlock: boolean) => Promise<void>;
    onManualStart: (key: string) => void;
}> = ({ entity, partyState, isBlock, onUpdate, onManualStart }) => {
    const [localTime, setLocalTime] = useState(formatISOForInput(entity.watchPartyStartTime));
    const [localEnabled, setLocalEnabled] = useState(entity.isWatchPartyEnabled || false);
    const [isSaving, setIsSaving] = useState(false);

    const hasChanged = localTime !== formatISOForInput(entity.watchPartyStartTime) || localEnabled !== (entity.isWatchPartyEnabled || false);

    const handleCommit = async () => {
        setIsSaving(true);
        await onUpdate(isBlock ? entity.id : entity.key, localTime, localEnabled, isBlock);
        setIsSaving(false);
    };

    return (
        <tr className="hover:bg-white/[0.01] transition-colors group">
            <td className="p-6">
                <p className="font-black text-white uppercase text-sm">{entity.title}</p>
                <p className="text-[9px] text-gray-600 uppercase mt-1">{isBlock ? 'FESTIVAL BLOCK' : 'CATALOG FILM'}</p>
            </td>
            <td className="p-6">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current ${getPartyStatusText(entity, partyState).color.replace('bg-', 'text-')}`}>
                    {getPartyStatusText(entity, partyState).text}
                </span>
            </td>
            <td className="p-6">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={localEnabled} onChange={e => setLocalEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </td>
            <td className="p-6">
                <input
                    type="datetime-local"
                    value={localTime}
                    onChange={e => setLocalTime(e.target.value)}
                    className="bg-white text-black font-black py-2 px-4 rounded-xl text-xs outline-none focus:ring-4 focus:ring-red-600 w-full max-w-[220px]"
                />
            </td>
            <td className="p-6 text-right space-x-4">
                <button 
                    onClick={handleCommit}
                    disabled={!hasChanged || isSaving}
                    className={`text-[9px] font-black uppercase px-4 py-2 rounded-lg transition-all ${hasChanged ? 'bg-red-600 text-white shadow-xl hover:bg-red-500' : 'bg-white/5 text-gray-700'}`}
                >
                    {isSaving ? 'Syncing...' : 'Sync Node'}
                </button>
                <button onClick={() => onManualStart(isBlock ? entity.id : entity.key)} className="text-red-500 hover:text-white font-black uppercase text-[8px] tracking-widest border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-all">Go Live</button>
            </td>
        </tr>
    );
};

export default WatchPartyManager;
