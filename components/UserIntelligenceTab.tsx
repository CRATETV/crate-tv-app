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
    
    const [msgSubject, setMsgSubject] = useState('');
    const [msgBody, setMsgBody] = useState('');
    const [attachedMovie, setAttachedMovie] = useState<Movie | null>(null);
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

    // CRITICAL FIX: Robust movie lookup with placeholder support
    const watchedMoviesList = useMemo(() => {
        if (!selectedUser) return [];
        return (selectedUser.watchedMovies || []).map(key => {
            const found = movies[key];
            if (found) return found;
            return { key, title: `Node: ${key.substring(0,8)}`, poster: '', director: 'Legacy/Unlisted', synopsis: '' } as Movie;
        });
    }, [selectedUser, movies]);

    const handleSynthesize = async (user: UserRecord) => {
        setIsSynthesizing(true);
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
            alert("Uplink failed.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handleExecuteDispatch = async () => {
        if (!selectedUser?.email || !msgSubject || !msgBody) return;
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
                    movieTitle: attachedMovie?.title,
                    posterUrl: attachedMovie?.poster,
                    movieKey: attachedMovie?.key
                }),
            });
            if (res.ok) {
                alert("Dispatch complete.");
                setMsgSubject('');
                setMsgBody('');
            }
        } finally {
            setIsDispatching(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[750px] animate-[fadeIn_0.5s_ease-out]">
            <div className="w-full lg:w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] space-y-4">
                    <h3 className="text-sm font-black uppercase text-gray-400">Node Directory</h3>
                    <input 
                        type="text" 
                        placeholder="Filter identities..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-red-600"
                    />
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-hide">
                    {filteredUsers.map(user => {
                        const activity = getActivityData(user.lastSignIn);
                        return (
                            <button 
                                key={user.uid}
                                onClick={() => setSelectedUser(user)}
                                className={`w-full text-left p-6 border-b border-white/5 transition-all group ${selectedUser?.uid === user.uid ? 'bg-red-600/5 !border-red-600/30' : 'hover:bg-white/[0.02]'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${activity.color}`}>{activity.label}</span>
                                    <span className="text-[9px] text-gray-700 font-mono">{(user.watchedMovies?.length || 0)} WATCHED</span>
                                </div>
                                <h4 className="text-sm font-black text-white uppercase truncate">{user.name || 'Unknown'}</h4>
                                <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
                {!selectedUser ? (
                    <div className="flex-grow flex items-center justify-center text-center opacity-20">
                        <p className="text-xs font-black uppercase tracking-[0.8em]">Awaiting Target Selection</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-y-auto p-10 space-y-12 scrollbar-hide">
                        <div className="flex justify-between items-start border-b border-white/5 pb-8">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">{selectedUser.name}</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase mt-2">{selectedUser.email}</p>
                            </div>
                            <button 
                                onClick={() => handleSynthesize(selectedUser)}
                                disabled={isSynthesizing}
                                className="bg-white text-black font-black px-8 py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all"
                            >
                                {isSynthesizing ? 'Analyzing...' : '✨ Synthesize Recommendation'}
                            </button>
                        </div>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Screening History</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {watchedMoviesList.map((movie, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-14 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                            {movie.poster && <img src={movie.poster} className="w-full h-full object-cover" alt="" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-white uppercase truncate">{movie.title}</p>
                                            <p className="text-[9px] text-gray-600 truncate">{movie.director}</p>
                                        </div>
                                    </div>
                                ))}
                                {watchedMoviesList.length === 0 && <p className="text-xs text-gray-700 font-bold italic uppercase">Manifest Empty</p>}
                            </div>
                        </section>

                        {(msgSubject || isSynthesizing) && (
                            <section className="bg-white/5 p-8 rounded-[2rem] border border-white/10 space-y-6 animate-[fadeIn_0.5s_ease-out]">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest">Drafting Dispatch</h4>
                                <div className="space-y-4">
                                    <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} className="form-input bg-black/40 border-white/10" placeholder="Subject" />
                                    <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} className="form-input bg-black/40 border-white/10 h-48 leading-relaxed" placeholder="Body" />
                                    <button 
                                        onClick={handleExecuteDispatch}
                                        disabled={isDispatching || !msgBody}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl transition-all"
                                    >
                                        {isDispatching ? 'Transmitting...' : 'Execute Dispatch'}
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserIntelligenceTab;