import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import { avatars } from './avatars';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';

const AccountPage: React.FC = () => {
    const { user, logout, setAvatar, updateName } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'fox');
    const [displayName, setDisplayName] = useState(user?.name || '');

    const handleSaveChanges = async () => {
        if (!user) return;
        
        const avatarChanged = user.avatar !== selectedAvatar;
        const nameChanged = user.name !== displayName && displayName.trim() !== '';

        if (!avatarChanged && !nameChanged) return;

        setIsSaving(true);
        try {
            const promises = [];
            if (avatarChanged) {
                promises.push(setAvatar(selectedAvatar));
            }
            if (nameChanged) {
                promises.push(updateName(displayName.trim()));
            }
            await Promise.all(promises);
        } catch (error) {
            console.error("Failed to save changes", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleNavigate = (e: React.MouseEvent<any>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
        window.scrollTo(0,0);
    };

    const handleMobileSearchClick = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    }

    if (!user) {
        return <LoadingSpinner />;
    }
    
    const hasChanges = user.avatar !== selectedAvatar || (user.name !== displayName && displayName.trim() !== '');
    const isCreator = user.isActor || user.isFilmmaker || user.isIndustryPro;

    return (
        <div className="flex flex-col min-h-screen bg-black text-white selection:bg-red-600">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />
            <main className="flex-grow pt-28 px-4 md:px-12 pb-24 md:pb-0">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                        <div>
                            <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px] mb-2">Member Terminal</p>
                            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">Account.</h1>
                        </div>
                        {isCreator && (
                            <button 
                                onClick={(e) => handleNavigate(e, '/portal')}
                                className="bg-white text-black font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                            >
                                Launch Creator Dashboard
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        )}
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* Avatar Selection */}
                            <div className="md:col-span-1 flex flex-col items-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6 w-full text-center md:text-left">Node Identity</p>
                                <div className="w-40 h-40 rounded-[2rem] bg-white/5 p-4 mb-6 border border-white/10 shadow-inner group" dangerouslySetInnerHTML={{ __html: avatars[selectedAvatar] }} />
                                <div className="grid grid-cols-5 gap-3">
                                    {Object.keys(avatars).map(avatarKey => (
                                        <button
                                            key={avatarKey}
                                            onClick={() => setSelectedAvatar(avatarKey)}
                                            className={`w-10 h-10 rounded-xl p-1.5 transition-all duration-300 border ${selectedAvatar === avatarKey ? 'bg-red-600 border-red-500 scale-110 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            dangerouslySetInnerHTML={{ __html: avatars[avatarKey] }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="md:col-span-2 space-y-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Encrypted Credentials</p>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Account UID</label>
                                        <p className="text-sm font-mono text-gray-300 bg-white/5 px-4 py-2 rounded-lg border border-white/5">{user.uid}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Auth Email</label>
                                        <p className="text-xl font-bold text-white">{user.email}</p>
                                    </div>
                                    <div>
                                        <label htmlFor="displayName" className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Display Handle</label>
                                        <input
                                            id="displayName"
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="form-input !bg-black !border-white/10 text-xl font-bold"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Authorization Tokens</label>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400">Viewer</span>
                                            {user.isActor && <span className="bg-purple-600/20 border border-purple-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-purple-400 shadow-lg shadow-purple-900/20">Verified Actor</span>}
                                            {user.isFilmmaker && <span className="bg-red-600/20 border border-red-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-red-400 shadow-lg shadow-red-900/20">Verified Filmmaker</span>}
                                            {user.isPremiumSubscriber && <span className="bg-yellow-600/20 border border-yellow-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-yellow-500 shadow-lg shadow-yellow-900/20">Premium Pass</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={(e) => handleNavigate(e, '/link-roku')}
                                        className="flex items-center gap-3 text-gray-400 hover:text-white transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Connect Hardware</p>
                                            <p className="text-xs font-bold">Link a Roku Streaming Device</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-center items-center gap-4">
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving || !hasChanges}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-20 text-white font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl shadow-red-900/40 transition-all transform active:scale-95 w-full sm:w-auto"
                            >
                                {isSaving ? 'Syncing Network...' : 'Commit Settings'}
                            </button>
                            <button onClick={logout} className="bg-white/5 hover:bg-white/10 text-gray-500 hover:text-red-500 font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs border border-white/5 transition-all w-full sm:w-auto">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
            <BottomNavBar onSearchClick={handleMobileSearchClick} />
        </div>
    );
};

export default AccountPage;