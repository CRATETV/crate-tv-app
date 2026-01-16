
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

interface EmbeddedChatProps {
    partyKey: string; 
    user: { name?: string; email: string | null; avatar?: string; } | null;
    entityName?: string; 
}

const EmbeddedChat: React.FC<EmbeddedChatProps> = ({ partyKey, user, entityName }: EmbeddedChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const messagesRef = db.collection('watch_parties').doc(partyKey).collection('messages').orderBy('timestamp', 'asc').limitToLast(200);
        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach(doc => { fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage); });
            setMessages(fetchedMessages);
        });
        return () => unsubscribe();
    }, [partyKey]);

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
                body: JSON.stringify({ movieKey: partyKey, userName: user.name || user.email, userAvatar: user.avatar || 'fox', text: newMessage }),
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
                Live Feed {entityName && `// ${entityName}`}
            </div>
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
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 border border-white/10 focus-within:border-red-600 transition-colors">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send message..." className="bg-transparent border-none text-white text-sm w-full focus:ring-0 py-3" disabled={!user || isSending} />
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
    const { user } = useAuth();
    const [isCopying, setIsCopying] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    
    // AUDIENCE TELEMETRY LISTENER
    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;

        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        const unsubscribe = db.collection('presence')
            .where('currentPartyId', '==', partyKey)
            .where('lastActive', '>=', oneMinAgo)
            .onSnapshot(snapshot => {
                setViewerCount(snapshot.size);
            });

        return () => unsubscribe();
    }, [partyKey]);

    const handleCopyInvite = () => {
        if (!partyState?.backstageKey) return;
        setIsCopying(true);
        const url = `${window.location.origin}/watchparty/${partyKey}`;
        const msg = `Invite to Backstage Talkback for "${entity.title}".\n\nLink: ${url}\nAccess Key: ${partyState.backstageKey}`;
        navigator.clipboard.writeText(msg);
        setTimeout(() => setIsCopying(false), 2000);
    };
    
    const status = getPartyStatusText(entity, partyState);
    const isLive = partyState?.status === 'live';

    return (
        <div className="bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl mb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-24 bg-gray-900 rounded-xl border border-white/10 flex items-center justify-center font-black text-2xl text-gray-700 italic">C</div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Monitor: {entity.title}</h2>
                        <div className="flex items-center gap-4 mt-3">
                            <span className={`px-3 py-1 text-[9px] font-black text-white rounded-full uppercase tracking-widest ${status.color}`}>
                                {status.text}
                            </span>
                            {isLive && (
                                <div className="flex items-center gap-2 bg-emerald-600/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Audience: {viewerCount} Nodes</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {isLive && (
                        <>
                            <button onClick={handleCopyInvite} className={`px-6 py-4 rounded-2xl uppercase font-black text-[10px] tracking-widest transition-all border border-white/10 ${isCopying ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                                {isCopying ? 'Invite Copied ✓' : 'Invite Guest Backstage'}
                            </button>
                            <button onClick={onEndParty} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs">
                                Terminate Session
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                     <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center justify-center">
                        <p className="text-emerald-500 font-black uppercase tracking-widest text-xs animate-pulse">Global Sync Loop Active</p>
                        <h3 className="text-white font-black text-xl uppercase mt-4">{isLive ? 'Session Streaming Globally' : 'Waiting for Automated Start'}</h3>
                     </div>
                </div>
                <div className="lg:col-span-1 h-[60vh] lg:h-auto">
                     <EmbeddedChat partyKey={partyKey} entityName={entity.title} user={user} />
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
    const { festivalData, refreshData } = useFestival();
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
        const block = festivalData.flatMap(d => d.blocks).find(b => b.id === liveKey);
        
        if (!movie && !block) return null;
        return { 
            entity: movie || block, 
            partyKey: liveKey,
            state 
        };
    }, [partyStates, allMovies, festivalData]);

    const handleEndParty = async () => {
        if (!activeParty) return;
        const db = getDbInstance();
        if (db) {
            await db.collection('watch_parties').doc(activeParty.partyKey).set({ 
                status: 'ended', 
                isPlaying: false,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    };

    const handleMovieSchedule = async (movieKey: string, startTime: string, enabled: boolean) => {
        const movie = allMovies[movieKey];
        if (!movie) return;
        const utcTime = startTime ? new Date(startTime).toISOString() : '';
        await onSave({ ...movie, watchPartyStartTime: utcTime, isWatchPartyEnabled: enabled });
    };

    const handleBlockSchedule = async (block: FilmBlock, startTime: string, enabled: boolean) => {
        const db = getDbInstance();
        if (!db) return;
        
        const utcTime = startTime ? new Date(startTime).toISOString() : '';
        const dayRef = festivalData.find(d => d.blocks.some(b => b.id === block.id));
        if (!dayRef) return;

        const updatedBlocks = dayRef.blocks.map(b => b.id === block.id ? { ...b, watchPartyStartTime: utcTime, isWatchPartyEnabled: enabled } : b);
        
        await db.collection('festival').doc('schedule').collection('days').doc(`day_${dayRef.day}`).update({
            blocks: updatedBlocks
        });
        await refreshData();
    };

    const filteredMovies = (Object.values(allMovies) as Movie[])
        .filter(m => m.title.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    const allBlocks = useMemo(() => festivalData.flatMap(d => d.blocks), [festivalData]);

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

            <div className="flex justify-center mb-12">
                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-1 shadow-2xl inline-flex">
                    <button onClick={() => setActiveTab('calendar')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Watch Calendar</button>
                    <button onClick={() => setActiveTab('access')} className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'access' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>Access Keys</button>
                </div>
            </div>

            {activeTab === 'calendar' && (
                <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-[fadeIn_0.4s_ease-out] space-y-12">
                    
                    {/* FESTIVAL BLOCKS SECTION */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Festival Block Protocol</h3>
                        <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                             <table className="w-full text-left text-xs">
                                <thead className="bg-white/5 text-gray-500 uppercase font-black">
                                    <tr>
                                        <th className="p-6">Film Block Node</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6">Enabled</th>
                                        <th className="p-6 text-right">Scheduled Start (Local)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allBlocks.map(block => (
                                        <tr key={block.id} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="p-6">
                                                <p className="font-black text-white uppercase text-sm tracking-tight">{block.title}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Contains {block.movieKeys.length} films</p>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current opacity-70 ${getPartyStatusText(block, partyStates[block.id]).color.replace('bg-', 'text-')}`}>
                                                    {getPartyStatusText(block, partyStates[block.id]).text}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={block.isWatchPartyEnabled || false} onChange={e => handleBlockSchedule(block, block.watchPartyStartTime || '', e.target.checked)} className="sr-only peer" />
                                                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </label>
                                            </td>
                                            <td className="p-6 text-right">
                                                <input
                                                    type="datetime-local"
                                                    value={formatISOForInput(block.watchPartyStartTime)}
                                                    onChange={e => handleBlockSchedule(block, e.target.value, block.isWatchPartyEnabled || false)}
                                                    className="form-input !py-2 !px-4 text-xs bg-black/40 border-white/10 w-64 text-right"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>

                    {/* INDIVIDUAL FILMS SECTION */}
                    <div className="space-y-6 pt-12 border-t border-white/5">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Standalone Film Manifest</h3>
                        <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 text-gray-500 uppercase font-black">
                                        <tr>
                                            <th className="p-6">Cinematic Node</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6">Enabled</th>
                                            <th className="p-6 text-right">Scheduled Start (Local)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredMovies.map(movie => (
                                            <tr key={movie.key} className="hover:bg-white/[0.01] transition-colors group">
                                                <td className="p-6">
                                                    <p className="font-black text-white uppercase text-sm tracking-tight">{movie.title}</p>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Dir. {movie.director}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current opacity-70 ${getPartyStatusText(movie, partyStates[movie.key]).color.replace('bg-', 'text-')}`}>
                                                        {getPartyStatusText(movie, partyStates[movie.key]).text}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" checked={movie.isWatchPartyEnabled || false} onChange={e => handleMovieSchedule(movie.key, movie.watchPartyStartTime || '', e.target.checked)} className="sr-only peer" />
                                                        <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                    </label>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <input
                                                        type="datetime-local"
                                                        value={formatISOForInput(movie.watchPartyStartTime)}
                                                        onChange={e => handleMovieSchedule(movie.key, e.target.value, movie.isWatchPartyEnabled || false)}
                                                        className="form-input !py-2 !px-4 text-xs bg-black/40 border-white/10 w-64 text-right"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchPartyManager;
