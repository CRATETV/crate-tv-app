
import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import GreenRoomFeed from './GreenRoomFeed';
import { useAuth } from '../contexts/AuthContext';
import MonologueGenerator from './MonologueGenerator';

const ActorPortalPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('practice'); // Default to the new practice tool

    if (!user) {
        // This should not happen due to route protection, but it's a good safeguard.
        return null; 
    }

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-2">Welcome to the Actor Portal, {user.name}!</h1>
                    <p className="text-gray-400 mb-8">Update your profile, connect with others, or hone your craft with our new tools.</p>
                    
                     <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                        <TabButton tabName="practice" label="Monologue Practice" />
                        <TabButton tabName="feed" label="Green Room Feed" />
                        <TabButton tabName="update" label="Update My Profile" />
                        <a 
                            href="/actors-directory" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                        >
                            View Public Directory
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>

                    {activeTab === 'practice' && (
                        <MonologueGenerator />
                    )}

                    {activeTab === 'update' && (
                        <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg">
                           {/* The existing form component would be here, this is just a placeholder example of how it would be structured */}
                           <h2 className="text-2xl font-bold text-white mb-4">Update Profile</h2>
                           <p className="text-gray-400">Your profile update form would be displayed here.</p>
                        </div>
                    )}
                    {activeTab === 'feed' && user.name && (
                        <GreenRoomFeed actorName={user.name} />
                    )}
                </div>
            </main>
            <Footer showPortalNotice={true} showActorLinks={true} />
        </div>
    );
};

export default ActorPortalPage;
