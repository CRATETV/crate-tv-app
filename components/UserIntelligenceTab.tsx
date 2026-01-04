
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
    const [recommendation, setRecommendation] = useState<{ subject: string, draft: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleSynthesize = async (user: UserRecord) => {
        setIsSynthesizing(true);
        setRecommendation(null);
        const password = sessionStorage.getItem('adminPassword');
        
        const watchedTitles = (user.watchedMovies || []).map(key => movies[key]?.title).filter(Boolean);

        try {
            const res = await fetch('/api/synthesize-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password, 
                    watchedTitles, 
                    userName: user.name,
                    catalog: movies 
                }),
            });
            const data = await res.json();
            setRecommendation(data);
        } catch (e) {
            alert("Synthesis error.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[700px] animate-[fadeIn_0.5s_ease-out]">
            
            {/* User Directory Sidebar */}
            <div className="w-full lg:w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Node Directory</h3>
                    <input 
                        type="text" 
                        placeholder="Search identities..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full mt-4 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-red-600 outline-none transition-all"
                    />
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-hide">
                    {filteredUsers.map(user => (
                        <button 
                            key={user.uid}
                            onClick={() => { setSelectedUser(user); setRecommendation(null); }}
                            className={`w-full text-left p-6 border-b border-white/5 transition-all hover:bg-white/[0.02] group ${selectedUser?.uid === user.uid ? 'bg-red-600/5 border-red-600/30' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${user.isPremiumSubscriber ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' : 'text-gray-500 border-white/10'}`}>
                                    {user.isPremiumSubscriber ? 'PREMIUM NODE' : 'STANDARD'}
                                </span>
                                <span className="text-[9px] text-gray-700 font-mono">{user.watchedMovies?.length || 0} VIEWS</span>
                            </div>
                            <h4 className={`text-sm font-black uppercase truncate ${selectedUser?.uid === user.uid ? 'text-red-500' : 'text-white'}`}>{user.name || 'Anonymous'}</h4>
                            <p className="text-[10px] text-gray-500 truncate font-medium">{user.email}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Intelligence Pane */}
            <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative">
                {!selectedUser ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                        <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-sm font-black uppercase tracking-[0.5em]">Identify Target for Recommendation</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-[fadeIn_0.3s_ease-out]">
                        {/* Header */}
                        <div className="p-10 border-b border-white/5 bg-white/[0.01] flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{selectedUser.name}</h2>
                                <p className="text-gray-500 text-sm font-bold mt-2">{selectedUser.email}</p>
                                <div className="flex gap-4 mt-6">
                                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-gray-600 uppercase font-black">History Depth</p>
                                        <p className="text-lg font-black text-white">{(selectedUser.watchedMovies || []).length} Films</p>
                                    </div>
                                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-gray-600 uppercase font-black">Sentiment Level</p>
                                        <p className="text-lg font-black text-red-500">{(selectedUser.likedMovies || []).length} Likes</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleSynthesize(selectedUser)}
                                disabled={isSynthesizing}
                                className="bg-white text-black font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3"
                            >
                                {isSynthesizing ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        Synthesizing Intelligence...
                                    </>
                                ) : 'Synthesize Recommendation'}
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-hide">
                            {recommendation ? (
                                <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                                    <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-10"><span className="text-4xl">✨</span></div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">AI Curated Proposal</h4>
                                        <div className="space-y-4">
                                            <p className="text-sm font-black text-white uppercase tracking-tight">Subject: {recommendation.subject}</p>
                                            <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-medium leading-relaxed">{recommendation.draft}</pre>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onPrepareRecommendation(selectedUser.email, recommendation.draft)}
                                            className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-xl"
                                        >
                                            Prepare Dispatch in Studio Mail
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <section>
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-6">Watch Manifest</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {(selectedUser.watchedMovies || []).map(key => (
                                                <div key={key} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                                    <img src={movies[key]?.poster} className="w-8 h-12 object-cover rounded shadow-lg" alt="" />
                                                    <p className="text-[10px] font-bold text-white uppercase truncate">{movies[key]?.title || 'Unknown'}</p>
                                                </div>
                                            ))}
                                            {(selectedUser.watchedMovies || []).length === 0 && (
                                                <p className="text-xs text-gray-700 uppercase font-black italic">History Stream Empty</p>
                                            )}
                                        </div>
                                    </section>
                                    
                                    <section>
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-6">Discovery Points (Likes)</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedUser.likedMovies || []).map(key => (
                                                <span key={key} className="bg-red-600/10 border border-red-500/20 text-red-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                                                    {movies[key]?.title || key}
                                                </span>
                                            ))}
                                            {(selectedUser.likedMovies || []).length === 0 && (
                                                <p className="text-xs text-gray-700 uppercase font-black italic">No Sentiment Logged</p>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserIntelligenceTab;
