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
    const [catalogSearch, setCatalogSearch] = useState('');

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
        return users.filter(u => 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const filteredCatalog = useMemo(() => {
        // FIX: Cast Object.values to Movie[] to ensure proper typing for properties like isUnlisted and title during filtering and sorting.
        return (Object.values(movies) as Movie[]).filter(m => 
            !m.isUnlisted && 
            (m.title || '').toLowerCase().includes(catalogSearch.toLowerCase())
        ).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }, [movies, catalogSearch]);

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

    const attachMovie = (movie: Movie) => {
        setAttachedMovie(movie);
        if (!msgSubject) setMsgSubject(`CRATE // Curatorial Suggestion: ${movie.title}`);
        setMsgBody(prev => prev || `Hello ${selectedUser?.name || 'there'},\n\nBased on your screening history, I thought you might appreciate "${movie.title}" by ${movie.director}.\n\nIt aligns perfectly with the aesthetic of your recently watched films.`);
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
                    movieKey: attachedMovie?.key,
                    synopsis: attachedMovie?.synopsis
                }),
            });
            if (res.ok) {
                alert("Dispatch complete.");
                setMsgSubject('');
                setMsgBody('');
                setAttachedMovie(null);
            }
        } finally {
            setIsDispatching(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[750px] animate-[fadeIn_0.5s_ease-out]">
            {/* USER SIDEBAR */}
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
                                onClick={() => { setSelectedUser(user); setMsgSubject(''); setMsgBody(''); setAttachedMovie(null); }}
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

            {/* MAIN CONTENT AREA */}
            <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
                {!selectedUser ? (
                    <div className="flex-grow flex items-center justify-center text-center opacity-20">
                        <p className="text-xs font-black uppercase tracking-[0.8em]">Awaiting Target Selection</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-y-auto p-10 space-y-12 scrollbar-hide">
                        <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/5 pb-8 gap-6">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">{selectedUser.name}</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase mt-2">{selectedUser.email}</p>
                            </div>
                            <button 
                                onClick={() => handleSynthesize(selectedUser)}
                                disabled={isSynthesizing}
                                className="bg-white text-black font-black px-8 py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all disabled:opacity-30"
                            >
                                {isSynthesizing ? 'Analyzing History...' : '✨ Auto-Synthesize Dispatch'}
                            </button>
                        </div>

                        {/* HISTORY SECTION */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Screening History</h3>
                                <div className="h-px flex-grow bg-white/5"></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {watchedMoviesList.map((movie, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-14 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                            {movie.poster && <img src={movie.poster} className="w-full h-full object-cover" alt="" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-white uppercase truncate">{movie.title}</p>
                                            <p className="text-[8px] text-gray-600 truncate">{movie.director}</p>
                                        </div>
                                    </div>
                                ))}
                                {watchedMoviesList.length === 0 && <p className="text-xs text-gray-700 font-bold italic uppercase">Manifest Empty</p>}
                            </div>
                        </section>

                        {/* CATALOG SELECTION HUB */}
                        <section className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">Suggestion Hub</h3>
                                <input 
                                    type="text" 
                                    placeholder="Filter catalog..." 
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-[10px] text-white focus:border-indigo-500 outline-none w-full md:w-64"
                                />
                            </div>
                            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                                {filteredCatalog.map(movie => (
                                    <button 
                                        key={movie.key}
                                        onClick={() => attachMovie(movie)}
                                        className={`flex-shrink-0 w-28 group relative rounded-xl overflow-hidden border-2 transition-all ${attachedMovie?.key === movie.key ? 'border-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-white/5 hover:border-white/20'}`}
                                    >
                                        <img src={movie.poster} className="w-full h-36 object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                            <p className="text-[8px] font-black uppercase text-white">Attach to Dispatch</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* COMPOSER SECTION */}
                        <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest">Personal Dispatch Manifest</h4>
                                {attachedMovie && (
                                    <div className="flex items-center gap-2 bg-red-600/10 px-3 py-1 rounded-full border border-red-500/20">
                                        <span className="text-[8px] font-black text-red-500 uppercase">Attached: {attachedMovie.title}</span>
                                        <button onClick={() => setAttachedMovie(null)} className="text-red-500 text-xs font-bold ml-1 hover:text-white transition-colors">×</button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                <input 
                                    value={msgSubject} 
                                    onChange={e => setMsgSubject(e.target.value)} 
                                    className="form-input bg-black/40 border-white/10 font-black text-xl italic tracking-tighter" 
                                    placeholder="Dispatch Headline..." 
                                />
                                <textarea 
                                    value={msgBody} 
                                    onChange={e => setMsgBody(e.target.value)} 
                                    className="form-input bg-black/40 border-white/10 h-64 leading-relaxed font-medium text-gray-300" 
                                    placeholder="Draft personalized message..." 
                                />
                                <div className="flex flex-col gap-6 pt-4">
                                    <button 
                                        onClick={handleExecuteDispatch}
                                        disabled={isDispatching || !msgBody || !msgSubject}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-2xl transition-all transform active:scale-95 disabled:opacity-20"
                                    >
                                        {isDispatching ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Transmitting...
                                            </div>
                                        ) : 'Execute Global Dispatch'}
                                    </button>
                                    <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.5em] text-center">Transmission via Crate Studio Relay // AES-256 Encrypted</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserIntelligenceTab;