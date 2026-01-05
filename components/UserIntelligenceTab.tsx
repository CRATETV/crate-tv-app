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

    const unwatchedMovies = useMemo(() => {
        if (!selectedUser) return [];
        const watchedKeys = new Set(selectedUser.watchedMovies || []);
        return (Object.values(movies) as Movie[])
            .filter(m => !watchedKeys.has(m.key) && !m.isUnlisted)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 12);
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
                               