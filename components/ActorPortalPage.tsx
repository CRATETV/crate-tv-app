import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import GreenRoomFeed from './GreenRoomFeed';
import { useAuth } from '../contexts/AuthContext';
import PlayFinder from './PlayFinder';
import ActorProfileEditor from './ActorProfileEditor';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import SearchOverlay from './SearchOverlay';

const ActorPortalPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('playFinder'); // Default to the new play finder tool
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // This is the critical safeguard. If the user object or the user's name isn't loaded yet,
    // show a spinner. This prevents child components from crashing with null/undefined props.
    if (!user || !user.name) {
        return <LoadingSpinner />; 
    }
    
    const handleSearchSubmit = (query: string) => {
        if (query) {
            const homeUrl = new URL('/', window.location.origin);
            homeUrl.searchParams.set('search', query);
            window.history.pushState({}, '', homeUrl.toString());
            window.dispatchEvent(new Event('pushstate'));
        }
        setIsMobileSearchOpen(false);
    };

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
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => setIsMobileSearchOpen(true)} showSearch={false} showNavLinks={false} />
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-2">Welcome to the Actor Portal, {user.name}!</h1>
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
            </main>
            <Footer showPortalNotice={true} showActorLinks={true} />
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />
            {isMobileSearchOpen && (
                <SearchOverlay
                    searchQuery=""
                    onSearch={() => {}}
                    onClose={() => setIsMobileSearchOpen(false)}
                    onSubmit={handleSearchSubmit}
                />
            )}
        </div>
    );
};

export default ActorPortalPage;