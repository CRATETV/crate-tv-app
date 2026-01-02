import React, { useState, useMemo } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import LoadingSpinner from './LoadingSpinner';
import { User } from '../types';

const UserTerminal: React.FC = () => {
    const [searchEmail, setSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;
        setIsSearching(true);
        setStatusMsg('');
        setFoundUser(null);

        try {
            const db = getDbInstance();
            if (!db) throw new Error("DB offline");
            
            const snapshot = await db.collection('users')
                .where('email', '==', searchEmail.trim().toLowerCase())
                .limit(1)
                .get();

            if (snapshot.empty) {
                setStatusMsg("Identity not found in database.");
            } else {
                const doc = snapshot.docs[0];
                setFoundUser({ uid: doc.id, ...doc.data() } as User);
            }
        } catch (err) {
            setStatusMsg("Search failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const toggleRole = async (role: 'isFilmmaker' | 'isActor' | 'isIndustryPro') => {
        if (!foundUser) return;
        setIsUpdating(true);
        try {
            const db = getDbInstance();
            if (!db) return;
            const newVal = !foundUser[role];
            await db.collection('users').doc(foundUser.uid).update({ [role]: newVal });
            setFoundUser({ ...foundUser, [role]: newVal });
            setStatusMsg(`Permission updated for ${role}.`);
        } catch (err) {
            setStatusMsg("Update failed.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] space-y-12 animate-[fadeIn_0.4s_ease-out]">
            <div className="border-b border-white/5 pb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Access Perimeter</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Manage identity permissions across the platform.</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl">
                <input 
                    type="email" 
                    value={searchEmail} 
                    onChange={e => setSearchEmail(e.target.value)} 
                    placeholder="Search user by email address..." 
                    className="form-input bg-black/40 border-white/10" 
                />
                <button type="submit" disabled={isSearching} className="bg-red-600 text-white font-black px-10 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-xl">
                    {isSearching ? 'Scanning...' : 'Fetch Identity'}
                </button>
            </form>

            {statusMsg && <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest bg-white/5 p-3 rounded-xl border border-white/5 w-max">{statusMsg}</p>}

            {foundUser && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-6">
                        <div>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">User Identity</p>
                            <h3 className="text-2xl font-black text-white uppercase">{foundUser.name || 'Anonymous User'}</h3>
                            <p className="text-gray-500 text-sm">{foundUser.email}</p>
                        </div>
                        <div className="pt-6 border-t border-white/5 space-y-2">
                             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">System Identifiers</p>
                             <code className="block text-[10px] text-gray-600 bg-black p-3 rounded-xl border border-white/5">UUID: {foundUser.uid}</code>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Access Privileges</h4>
                        <div className="grid gap-4">
                            {[
                                { id: 'isFilmmaker' as const, label: 'Filmmaker Dashboard', color: 'bg-blue-600' },
                                { id: 'isActor' as const, label: 'Actor Hub & Directory', color: 'bg-purple-600' },
                                { id: 'isIndustryPro' as const, label: 'Industry Discovery Terminal', color: 'bg-green-600' }
                            ].map(role => (
                                <div key={role.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-tight">{role.label}</p>
                                        {/* FIX: Corrected object access by using role.id instead of role object */}
                                        <p className={`text-[9px] font-black uppercase mt-1 tracking-widest ${foundUser[role.id] ? 'text-green-500' : 'text-gray-600'}`}>
                                            {foundUser[role.id] ? 'PROTOCOL_AUTHORIZED' : 'ACCESS_RESTRICTED'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => toggleRole(role.id)} 
                                        disabled={isUpdating}
                                        {/* FIX: Corrected object access by using role.id instead of role object */}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${foundUser[role.id] ? 'bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-white/10 border border-white/20 text-gray-400 hover:bg-white hover:text-black'}`}
                                    >
                                        {foundUser[role.id] ? 'Revoke' : 'Authorize'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserTerminal;