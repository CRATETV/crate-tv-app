import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import { avatars } from './avatars';
import LoadingSpinner from './LoadingSpinner';

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
            // Optionally show an error to the user
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (!user) {
        return <LoadingSpinner />;
    }
    
    const hasChanges = user.avatar !== selectedAvatar || (user.name !== displayName && displayName.trim() !== '');

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
            />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">Account Settings</h1>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Avatar Selection */}
                            <div className="md:col-span-1 flex flex-col items-center">
                                <h2 className="text-xl font-semibold mb-4">Choose Your Avatar</h2>
                                <div className="w-32 h-32 rounded-full bg-gray-700 p-2 mb-4" dangerouslySetInnerHTML={{ __html: avatars[selectedAvatar] }} />
                                <div className="grid grid-cols-5 gap-2">
                                    {Object.keys(avatars).map(avatarKey => (
                                        <button
                                            key={avatarKey}
                                            onClick={() => setSelectedAvatar(avatarKey)}
                                            className={`w-12 h-12 rounded-full p-1 transition-all duration-200 ${selectedAvatar === avatarKey ? 'bg-purple-600 scale-110' : 'bg-gray-600 hover:bg-gray-500'}`}
                                            dangerouslySetInnerHTML={{ __html: avatars[avatarKey] }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="md:col-span-2 space-y-4">
                                <h2 className="text-xl font-semibold mb-4">Your Details</h2>
                                <div>
                                    <label className="text-sm text-gray-400">Email</label>
                                    <p className="text-lg">{user.email}</p>
                                </div>
                                 <div>
                                    <label htmlFor="displayName" className="text-sm text-gray-400">Display Name</label>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="form-input mt-1 w-full text-lg"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Roles</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {user.isActor && <span className="badge">Actor</span>}
                                        {user.isFilmmaker && <span className="badge">Filmmaker</span>}
                                        {user.isPremiumSubscriber && <span className="badge bg-yellow-500 text-black">Premium</span>}
                                        {!user.isActor && !user.isFilmmaker && !user.isPremiumSubscriber && <span className="text-gray-500 text-sm">No special roles assigned.</span>}
                                    </div>
                                </div>
                                
                                 <div className="pt-4 mt-4 border-t border-gray-700">
                                    <a href="/link-roku" onClick={(e) => handleNavigate(e, '/link-roku')} className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-2">
                                        Link a Roku Device
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                         <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving || !hasChanges}
                                className="submit-btn w-full sm:w-auto"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors w-full sm:w-auto">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default AccountPage;