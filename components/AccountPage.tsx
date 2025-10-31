import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { avatars } from './avatars';

const AccountPage: React.FC = () => {
    const { user, logout, setAvatar } = useAuth();

    // The main router now protects this page, so we can assume user is not null.
    if (!user) {
        return null; // Render nothing if user is somehow null
    }

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white relative">
            <div className="absolute top-6 left-6 z-10">
                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Home
                </a>
            </div>
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-white mb-6">My Account</h1>
                    
                    <div className="space-y-4">
                        <div className="bg-gray-700/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">Email Address</p>
                            <p className="text-lg text-white font-medium">{user.email}</p>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400 mb-3">Choose Your Avatar</p>
                            <div className="grid grid-cols-4 gap-4">
                                {Object.entries(avatars).map(([id, svg]) => (
                                    <button
                                        key={id}
                                        onClick={() => setAvatar(id)}
                                        className={`p-2 rounded-full transition-all duration-200 ${user.avatar === id ? 'bg-red-500 ring-2 ring-offset-2 ring-offset-gray-700 ring-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                                        aria-label={`Select ${id} avatar`}
                                        dangerouslySetInnerHTML={{ __html: svg }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AccountPage;
