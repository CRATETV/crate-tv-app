
import React, { useState } from 'react';
import GreenRoomFeed from './GreenRoomFeed';
import { useAuth } from '../contexts/AuthContext';
import PlayFinder from './PlayFinder';
import ActorProfileEditor from './ActorProfileEditor';
import LoadingSpinner from './LoadingSpinner';

const ActorPortalView: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('playFinder');

    if (!user || !user.name) {
        return <LoadingSpinner />; 
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
        <div>
            <h1 className="text-4xl font-bold text-white mb-2">Actor Portal</h1>
            <p className="text-gray-400 mb-8">Update your profile, connect with others, or hone your craft with our new tools.</p>
            
             <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                <TabButton tabName="playFinder" label="Play Finder" />
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

            {activeTab === 'playFinder' && (
                <PlayFinder />
            )}
            {activeTab === 'update' && user.name && (
                <ActorProfileEditor actorName={user.name} />
            )}
            {activeTab === 'feed' && user.name && (
                <GreenRoomFeed actorName={user.name} />
            )}
        </div>
    );
};

export default ActorPortalView;
