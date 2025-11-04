
import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import ActorPortalView from './ActorPortalView';
import FilmmakerDashboardView from './FilmmakerDashboardView';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import SearchOverlay from './SearchOverlay';
import { Movie } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import { useMemo } from 'react';

const CreatorDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { movies } = useFestival();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default to the most "active" role (filmmaker > actor), or whichever they have.
    const defaultTab = user?.isFilmmaker ? 'filmmaker' : 'actor';
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return (Object.values(movies) as Movie[]).filter(movie =>
            movie && (
                (movie.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.director || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
            )
        );
    }, [searchQuery, movies]);

    const handleSelectFromSearch = (movie: Movie) => {
        setIsMobileSearchOpen(false);
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };
    
    if (!user) {
        return <LoadingSpinner />;
    }

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-6 py-3 text-lg font-bold transition-colors duration-300 rounded-t-lg border-b-2 ${activeTab === tabName ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header 
                searchQuery={searchQuery}
                onSearch={setSearchQuery} 
                isScrolled={true} 
                onMobileSearchClick={() => setIsMobileSearchOpen(true)}
                showSearch={false} 
                showNavLinks={false} 
            />
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    {/* Only show tabs if user has both roles */}
                    {user.isActor && user.isFilmmaker && (
                         <div className="border-b border-gray-700 mb-8">
                            <TabButton tabName="filmmaker" label="Filmmaker" />
                            <TabButton tabName="actor" label="Actor" />
                        </div>
                    )}

                    {activeTab === 'filmmaker' && user.isFilmmaker && <FilmmakerDashboardView />}
                    {activeTab === 'actor' && user.isActor && <ActorPortalView />}
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />
             {isMobileSearchOpen && (
                <SearchOverlay
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    onClose={() => setIsMobileSearchOpen(false)}
                    results={searchResults}
                    onSelectMovie={handleSelectFromSearch}
                />
            )}
        </div>
    );
};

export default CreatorDashboardPage;
