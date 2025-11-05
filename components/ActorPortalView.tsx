import React from 'react';
import GreenRoomFeed from './GreenRoomFeed';
import { useAuth } from '../contexts/AuthContext';
import PlayFinder from './PlayFinder';
import ActorProfileEditor from './ActorProfileEditor';
import LoadingSpinner from './LoadingSpinner';

const ActorPortalView: React.FC = () => {
    const { user } = useAuth();

    if (!user || !user.name) {
        return <LoadingSpinner />; 
    }
    
    return (
        <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white">Actor Portal</h1>
                    <p className="text-gray-400 mt-2">Update your profile, connect with others, or hone your craft with our new tools.</p>
                </div>
                 <a 
                    href="/actors-directory" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 self-start md:self-center"
                >
                    View Directory
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Editor */}
                <div className="lg:col-span-2">
                    <ActorProfileEditor actorName={user.name} />
                </div>

                {/* Right Column: Tools */}
                <div className="space-y-8">
                    <PlayFinder />
                    <GreenRoomFeed actorName={user.name} />
                </div>
            </div>
        </div>
    );
};

export default ActorPortalView;