import React, { useState, useEffect, useMemo } from 'react';
import { UserRecord, Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface UserIntelligenceTabProps {
    movies: Record<string, Movie>;
    onPrepareRecommendation: (email: string, draft: string) => void;
}

const UserIntelligenceTab: React.FC<UserIntelligenceTabProps> = ({ movies, onPrepareRecommendation }) => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);
    
    // Messaging State
    const [msgSubject, setMsgSubject] = useState('');
    const [msgBody, setMsgBody] = useState('');
    const [attachedMovie, setAttachedMovie] = useState<Movie | null>(null);
    
    // Scheduling State
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const fetchUsers = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/get-user-intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            setUsers(data.users || []);
        } catch (e) {
            console.error("Intelligence fetch failure:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const getActivityData = (lastSignIn: any) => {
        if (!lastSignIn) return { days: 999, label: 'Never', color: 'text-red-500' };
        const date = new Date(lastSignIn);
        const diff = Date.now() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days < 3) return { days, label: 'High Activity', color: 'text-green-500' };
        if (days < 10) return { days, label: 'Steady', color: 'text-blue-400' };
        if (days < 30) return { days, label: 'Dormant', color: 'text-amber-500' };
        return { days, label: 'Inactive', color: 'text-gray-600' };
    };

    const filteredUsers = useMemo(() => {
        let result = users.filter(u => 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filter === 'active') result = result.filter(u => getActivityData(u.lastSignIn).days < 7);
        if (filter === 'inactive') result = result.filter(u => getActivityData(u.lastSignIn).days >= 7);

        return result;
    }, [users, searchTerm, filter]);

    const watchedMoviesList = useMemo(() => {
        if (!selectedUser) return [];
        return (selectedUser.watchedMovies || [])
            .map(key => movies[key])
            .filter(Boolean);
    }, [selectedUser, movies]);

    const suggestedAcquisitions = useMemo(() => {
        if (!selectedUser) return [];
        const watchedKeys = new Set(selectedUser.watchedMovies || []);
        return (Object.values(movies) as Movie[])
            .filter(m => !watchedKeys.has(m.key) && !m.isUnlisted)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [selectedUser, movies]);

    const handleSynthesize = async (user: UserRecord) => {
        setIsSynthesizing(true);
        setMsgSubject('');
        setMsgBody('');
        setAttachedMovie(null);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const watchedTitles = (user.watchedMovies || []).map(k => movies[k]?.title).filter(Boolean);
            const res = await fetch('/api/synthesize-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, watchedTitles, userName: user.name, catalog: movies }),
            });
            const data = await res.json();
            
            setMsgSubject(data.subject);
            setMsgBody(data.draft);
            if (data.recommendedKey && movies[data.recommendedKey]) {
                setAttachedMovie(movies[data.recommendedKey]);
            }
        } catch (e) {
            alert("Uplink to Gemini Core timed out.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const bindMetadataToDispatch = (movie: Movie) => {
        setAttachedMovie(movie);
        const hookText = `I specifically wanted to highlight "${movie.title}" directed by ${movie.director}. Based on your previous screening history, this film aligns with the technical pedigree you've previously engaged with.`;
        
        if (!msgBody) {
            setMsgSubject(`CRATE // Curatorial Spotlight: ${movie.title.toUpperCase()}`);
            setMsgBody(`Hello ${selectedUser?.name || 'there'},\n\n${hookText}\n\nWe look forward to your session notes.\n\nBest,\nThe Crate Zine Editorial Team`);
        } else {
            setMsgBody(prev => prev + `\n\n[CURATOR_NOTE: ${hookText}]`);
        }
    };

    const handleExecuteDispatch = async () => {
        if (!selectedUser?.email || !msgSubject || !msgBody) {
            alert("Dispatch aborted: Recipient identity or payload manifest incomplete.");
            return;
        }
        setIsDispatching(true);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const res = await fetch('/api/send-individual-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    email: selectedUser.email, 
                    subject: msgSubject, 
                    htmlBody: msgBody.replace(/\n/g, '<br/>'),
                    scheduledAt: isScheduling ? scheduledTime : undefined,
                    movieTitle: attachedMovie?.title,
                    posterUrl: attachedMovie?.poster,
                    synopsis: attachedMovie?.synopsis,
                    movieKey: attachedMovie?.key
                }),
            });
            if (res.ok) {
                alert("Transmission Successfully Dispatched.");
                setMsgSubject('');
                setMsgBody('');
                setAttachedMovie(null);
            } else {
                const errData = await res.json();
                throw new Error(errData.error || "Handshake rejected.");
            }
        } catch (e) {
            alert(`Dispatch Error: ${e instanceof Error ? e.message : 'Unknown'}`);
        } finally {
            setIsDispatching(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[750px] animate-[fadeIn_0.5s_ease-out]">
            
            {/* LEFT: Node Directory */}
            <div className="w-full lg:w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Node Cluster</h3>
                        <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded">SYNC_ACTIVE</span>
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'active', 'inactive'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600 hover:text-gray-400'}`}>{f}</button>
                        ))}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Scan for identity..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-red-600 outline-none transition-all"
                    />
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-hide">
                    {filteredUsers.length === 0 ? (
                        <div className="p-10 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-widest">No nodes found</p></div>
                    ) : filteredUsers.map(user => {
                        const activity = getActivityData(user.lastSignIn);
                        return (
                            <button 
                                key={user.uid}
                                onClick={() => { setSelectedUser(user); setMsgSubject(''); setMsgBody(''); setAttachedMovie(null); }}
                                className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] group ${selectedUser?.uid === user.uid ? 'bg-red-600/5 !border-red-600/30' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${activity.days < 7 ? 'bg-green-500' : 'bg-gray-700'}`}></span>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${activity.color}`}>{activity.label}</span>
                                    </div>
                                    <span className="text-[9px] text-gray-700 font-mono tracking-tighter">{(user.watchedMovies?.length || 0)} FILMS</span>
                                </div>
                                <h4 className={`text-sm font-black uppercase truncate group-hover:text-red-500 transition-colors ${selectedUser?.uid === user.uid ? 'text-red-500' : 'text-white'}`}>{user.name || 'Anonymous Node'}</h4>
                                <p className="text-[10px] text-gray-600 truncate font-medium">{user.email}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: Intelligence Dashboard */}
            <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative">
                {!selectedUser ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                        <div className="w-24 h-24 border-2 border-dashed border-gray-800 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.8em]">Awaiting Target Selection</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
                        <div className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex-grow space-y-4">
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{selectedUser.name || 'Anonymous Node'}</h2>
                                <div className="flex gap-4">
                                    <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Node Uplink</p>
                                        <p className="text-xs font-bold text-white uppercase">{selectedUser.email}</p>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Recency</p>
                                        <p className={`text-xs font-bold uppercase ${getActivityData(selectedUser.lastSignIn).color}`}>
                                            {getActivityData(selectedUser.lastSignIn).label}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleSynthesize(selectedUser)}
                                disabled={isSynthesizing}
                                className="bg-white text-black font-black px-10 py-5 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-3"
                            >
                                {isSynthesizing ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        Analyzing Manifest...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg">✨</span>
                                        Synthesize Curatorial Dispatch
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-hide">
                            
                            {/* Manifest Profile Visualization */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-black/40 border border-white/5 p-8 rounded-3xl space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500">Screening Manifest</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {watchedMoviesList.length > 0 ? watchedMoviesList.map(movie => (
                                            <div key={movie.key} className="w-20 group relative">
                                                <img src={movie.poster} className="aspect-[3/4] rounded-lg object-cover border border-white/10 shadow-lg opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                                                    <p className="text-[8px] font-black text-white uppercase text-center leading-tight">{movie.title}</p>
                                                </div>
                                            </div>
                                        )) : <p className="text-xs text-gray-700 font-bold uppercase">No data recorded.</p>}
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-white/5 p-8 rounded-3xl space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Suggested Acquistions</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {suggestedAcquisitions.map(movie => (
                                            <button 
                                                key={movie.key} 
                                                onClick={() => bindMetadataToDispatch(movie)}
                                                className={`w-20 group relative transition-all ${attachedMovie?.key === movie.key ? 'ring-2 ring-red-600 p-1 rounded-xl' : ''}`}
                                            >
                                                <img src={movie.poster} className="aspect-[3/4] rounded-lg object-cover border border-white/10 shadow-lg opacity-40 group-hover:opacity-80" alt="" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-white text-black px-2 py-1 rounded text-[8px] font-black uppercase">Bind</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] shadow-inner space-y-8">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                        Studio Dispatch Dispatch Terminal
                                    </h4>
                                    {attachedMovie && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Metadata Bound: {attachedMovie.title}</span>}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-gray-600 mb-2 block">Subject Frequency</label>
                                        <input 
                                            value={msgSubject} 
                                            onChange={e => setMsgSubject(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-6 py-4 text-lg font-black italic tracking-tighter text-white focus:border-red-600 outline-none"
                                            placeholder="AWAITING HEADLINE..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-gray-600 mb-2 block">Editorial Payload</label>
                                        <textarea 
                                            value={msgBody} 
                                            onChange={e => setMsgBody(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-6 py-6 text-sm text-gray-300 min-h-[250px] leading-relaxed font-medium focus:border-red-600 outline-none"
                                            placeholder="Compose curatorial memo..."
                                        />
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-black/20 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={isScheduling} onChange={e => setIsScheduling(e.target.checked)} className="sr-only peer" />
                                                <div className="w-12 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                            </label>
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Schedule Transmission</span>
                                        </div>
                                        {isScheduling && (
                                            <input 
                                                type="datetime-local" 
                                                value={scheduledTime}
                                                onChange={e => setScheduledTime(e.target.value)}
                                                className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-indigo-400 font-black animate-[fadeIn_0.3s_ease-out] outline-none focus:border-indigo-500"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => { setMsgBody(''); setMsgSubject(''); setAttachedMovie(null); }}
                                        className="px-10 py-5 text-gray-600 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                                    >
                                        Abort Synthesis
                                    </button>
                                    <button 
                                        onClick={handleExecuteDispatch}
                                        disabled={isDispatching || !msgBody || !selectedUser}
                                        className="flex-grow bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-[0_20px_50px_rgba(239,68,68,0.3)] transition-all active:scale-98 disabled:opacity-20 flex items-center justify-center gap-3"
                                    >
                                        {isDispatching ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Transmitting Payload...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Execute Global Dispatch
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserIntelligenceTab;