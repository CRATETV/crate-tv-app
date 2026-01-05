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
    const [dispatchMode, setDispatchMode] = useState<'rec' | 'direct'>('rec');
    
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
            console.error(e);
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
        
        if (days < 7) return { days, label: 'Active', color: 'text-green-500' };
        if (days < 30) return { days, label: 'Dormant', color: 'text-amber-500' };
        return { days, label: 'Inactive', color: 'text-red-600' };
    };

    const filteredUsers = useMemo(() => {
        let result = users.filter(u => 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filter === 'active') result = result.filter(u => getActivityData(u.lastSignIn).days < 7);
        if (filter === 'inactive') result = result.filter(u => getActivityData(u.lastSignIn).days > 14);

        return result;
    }, [users, searchTerm, filter]);

    const watchedMoviesList = useMemo(() => {
        if (!selectedUser) return [];
        return (selectedUser.watchedMovies || [])
            .map(key => movies[key])
            .filter(Boolean);
    }, [selectedUser, movies]);

    const unwatchedMovies = useMemo(() => {
        if (!selectedUser) return [];
        const watchedKeys = new Set(selectedUser.watchedMovies || []);
        return (Object.values(movies) as Movie[])
            .filter(m => !watchedKeys.has(m.key) && !m.isUnlisted)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }, [selectedUser, movies]);

    const handleSynthesize = async (user: UserRecord, mode: 'rec' | 'direct') => {
        setIsSynthesizing(true);
        setMsgSubject('');
        setMsgBody('');
        setAttachedMovie(null);
        setDispatchMode(mode);
        const password = sessionStorage.getItem('adminPassword');

        try {
            const endpoint = mode === 'rec' ? '/api/synthesize-recommendation' : '/api/synthesize-direct-message';
            const body = mode === 'rec' 
                ? { password, watchedTitles: (user.watchedMovies || []).map(k => movies[k]?.title).filter(Boolean), userName: user.name, catalog: movies }
                : { password, userData: user, catalog: movies };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            
            if (mode === 'rec') {
                setMsgSubject(data.subject);
                setMsgBody(data.draft);
            } else {
                setMsgSubject(data.subject);
                setMsgBody(data.body);
            }
        } catch (e) {
            alert("Synthesis error.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const injectMovieHook = (movie: Movie) => {
        setAttachedMovie(movie);
        const greeting = `Hello ${selectedUser?.name || 'there'},\n\n`;
        const hook = `I was reviewing our recent catalog updates and I noticed you haven't had a chance to screen "${movie.title}" yet. \n\nIt's currently one of our highest-rated selections and I think it would align perfectly with your previous watches. Have you seen it yet?\n\nBest,\nThe Crate Zine Editorial Team`;
        
        setMsgSubject(`CRATE // Transmission regarding ${movie.title.toUpperCase()}`);
        setMsgBody(greeting + hook);
        
        const terminal = document.getElementById('dispatch-terminal');
        if (terminal) terminal.scrollIntoView({ behavior: 'smooth' });
    };

    const handleExecuteDispatch = async () => {
        if (!selectedUser || !msgSubject || !msgBody) return;
        
        if (isScheduling && !scheduledTime) {
            alert("Please select a time for scheduling.");
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
                alert(isScheduling ? `Dispatch queued for execution at: ${scheduledTime}` : `Dispatch successful to node: ${selectedUser.email}`);
                setMsgSubject('');
                setMsgBody('');
                setAttachedMovie(null);
                setIsScheduling(false);
                setScheduledTime('');
            }
        } catch (e) {
            alert("Transmission failure.");
        } finally {
            setIsDispatching(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[700px] animate-[fadeIn_0.5s_ease-out]">
            
            {/* User Directory Sidebar */}
            <div className="w-full lg:w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Node Directory</h3>
                    <div className="flex gap-2">
                        {(['all', 'active', 'inactive'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>{f}</button>
                        ))}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search identities..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-red-600 outline-none"
                    />
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-hide">
                    {filteredUsers.map(user => {
                        const activity = getActivityData(user.lastSignIn);
                        return (
                            <button 
                                key={user.uid}
                                onClick={() => { setSelectedUser(user); setMsgSubject(''); setMsgBody(''); setAttachedMovie(null); }}
                                className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] group ${selectedUser?.uid === user.uid ? 'bg-red-600/5 border-red-600/30' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${activity.days < 7 ? 'bg-green-500' : 'bg-gray-700'}`}></span>
                                        <span className={`text-[7px] font-black uppercase tracking-widest ${activity.color}`}>{activity.label}</span>
                                    </div>
                                    <span className="text-[9px] text-gray-700 font-mono">{user.watchedMovies?.length || 0} VIEWS</span>
                                </div>
                                <h4 className={`text-sm font-black uppercase truncate ${selectedUser?.uid === user.uid ? 'text-red-500' : 'text-white'}`}>{user.name || 'Anonymous'}</h4>
                                <p className="text-[10px] text-gray-500 truncate font-medium">{user.email}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Intelligence Pane */}
            <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative">
                {!selectedUser ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                        <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-sm font-black uppercase tracking-[0.5em]">Identify Target Node</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
                        <div className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex-grow">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{selectedUser.name || 'Anonymous Node'}</h2>
                                <p className="text-gray-500 text-sm font-bold mt-2">Uplink: {selectedUser.email}</p>
                                <div className="flex gap-4 mt-6">
                                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-gray-600 uppercase font-black">Recency Heat</p>
                                        <p className={`text-lg font-black ${getActivityData(selectedUser.lastSignIn).color}`}>
                                            {getActivityData(selectedUser.lastSignIn).days === 0 ? 'Today' : `${getActivityData(selectedUser.lastSignIn).days}d ago`}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-gray-600 uppercase font-black">Velocity</p>
                                        <p className="text-lg font-black text-white">{(selectedUser.watchedMovies || []).length} Films</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => handleSynthesize(selectedUser, 'direct')}
                                    disabled={isSynthesizing}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-xl transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                                >
                                    {isSynthesizing && dispatchMode === 'direct' ? 'Analyzing Behavior...' : 'Synthesize Personal Memo'}
                                </button>
                                <button 
                                    onClick={() => handleSynthesize(selectedUser, 'rec')}
                                    disabled={isSynthesizing}
                                    className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-gray-200 transition-all disabled:opacity-20"
                                >
                                    {isSynthesizing && dispatchMode === 'rec' ? 'Analyzing Manifest...' : 'Synthesize Film Rec'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-hide">
                            
                            {/* Uplink Manifest Row (Watched Movies) */}
                            <section className="animate-[fadeIn_0.5s_ease-out]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500">Uplink Manifest</h3>
                                    <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest bg-black border border-white/5 px-2 py-1 rounded">Films screened by this node</span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {watchedMoviesList.length > 0 ? watchedMoviesList.map(movie => (
                                        <div key={movie.key} className="flex-shrink-0 w-24 opacity-60">
                                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/5 shadow-lg">
                                                <img src={movie.poster} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase mt-2 truncate">{movie.title}</p>
                                        </div>
                                    )) : (
                                        <div className="py-8 w-full text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                            <p className="text-[10px] font-black uppercase tracking-widest">No screening history recorded</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Discovery Pipeline Row (Unwatched Movies) */}
                            <section className="animate-[fadeIn_0.5s_ease-out]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Discovery Pipeline</h3>
                                    <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest bg-black border border-white/5 px-2 py-1 rounded">Films this node is missing (Full Catalog)</span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                                    {unwatchedMovies.length > 0 ? unwatchedMovies.map(movie => (
                                        <div 
                                            key={movie.key} 
                                            className={`flex-shrink-0 w-32 group cursor-pointer transition-all ${attachedMovie?.key === movie.key ? 'ring-2 ring-red-600 p-1 rounded-2xl bg-red-600/5' : ''}`}
                                            onClick={() => injectMovieHook(movie)}
                                        >
                                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/5 shadow-xl group-hover:border-red-600/50 transition-all">
                                                <img src={movie.poster} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" alt="" />
                                                <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/20 transition-colors flex items-center justify-center">
                                                    <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-2xl">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[9px] font-black text-white uppercase mt-2 truncate group-hover:text-red-500 transition-colors">{movie.title}</p>
                                            <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Bind Metadata</p>
                                        </div>
                                    )) : (
                                        <div className="py-12 w-full text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                            <p className="text-xs font-black uppercase tracking-widest">Node has screened all catalog entries</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div id="dispatch-terminal" className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-inner">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-8 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                        Secure Dispatch Terminal
                                    </h4>

                                    {attachedMovie && (
                                        <div className="mb-8 p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center justify-between animate-[fadeIn_0.3s_ease-out]">
                                            <div className="flex items-center gap-4">
                                                <img src={attachedMovie.poster} className="w-12 h-16 object-cover rounded-lg shadow-xl" alt="" />
                                                <div>
                                                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Metadata Attachment Bound</p>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{attachedMovie.title}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Poster + Synopsis will be injected into dispatch</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setAttachedMovie(null)}
                                                className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
                                            >
                                                Clear Binding
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[8px] font-black uppercase text-gray-600 mb-2 block">Subject Line</label>
                                            <input 
                                                value={msgSubject} 
                                                onChange={e => setMsgSubject(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-red-600 outline-none"
                                                placeholder="Transmission Headline..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black uppercase text-gray-600 mb-2 block">Payload Content</label>
                                            <textarea 
                                                value={msgBody} 
                                                onChange={e => setMsgBody(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-4 text-sm text-gray-300 min-h-[200px] leading-relaxed font-medium focus:border-red-600 outline-none"
                                                placeholder="Compose personal dispatch..."
                                            />
                                        </div>
                                        
                                        <div className="flex items-center gap-6 p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={isScheduling} onChange={e => setIsScheduling(e.target.checked)} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </label>
                                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Schedule Transmission</span>
                                            </div>
                                            {isScheduling && (
                                                <input 
                                                    type="datetime-local" 
                                                    value={scheduledTime}
                                                    onChange={e => setScheduledTime(e.target.value)}
                                                    className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-indigo-400 font-black animate-[fadeIn_0.3s_ease-out]"
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-10 flex gap-4">
                                        <button 
                                            onClick={() => { setMsgBody(''); setMsgSubject(''); setIsScheduling(false); setAttachedMovie(null); }}
                                            className="flex-1 px-6 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                                        >
                                            Discard Draft
                                        </button>
                                        <button 
                                            onClick={handleExecuteDispatch}
                                            disabled={isDispatching || !msgBody}
                                            className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl shadow-red-900/40 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
                                        >
                                            {isDispatching ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    {isScheduling ? 'QUEUING...' : 'TRANSMITTING...'}
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                    {isScheduling ? 'Schedule Dispatch' : 'Execute Dispatch'}
                                                </>
                                            )}
                                        </button>
                                    </div>
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