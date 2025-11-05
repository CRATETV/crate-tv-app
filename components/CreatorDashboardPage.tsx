import React, { useState, useEffect } from 'react';
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
    const defaultView = user?.isFilmmaker ? 'filmmaker' : 'actor';
    const [activeView, setActiveView] = useState<'filmmaker' | 'actor'>(defaultView);
    
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

    const isDualRole = user.isFilmmaker && user.isActor;

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
                     <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white">Welcome, {user.name}</h1>
                        <p className="text-gray-400 mt-2">
                            {user.isFilmmaker && !user.isActor
                                ? "This is your personal dashboard for managing your films and tracking performance."
                                : !user.isFilmmaker && user.isActor
                                ? "This is your personal portal for managing your profile and connecting with the community."
                                : "" // Dual role message is handled below
                            }
                        </p>
                    </div>

                    {isDualRole && (
                        <div className="mb-8">
                            <p className="text-gray-400 mt-2 mb-4">You have access to both Filmmaker and Actor portals. Switch between them below.</p>
                            <div className="flex items-center gap-2 md:gap-6 border-b border-gray-700">
                                <button
                                    onClick={() => setActiveView('filmmaker')}
                                    className={`flex items-center gap-2 py-3 px-4 font-semibold border-b-4 transition-colors ${activeView === 'filmmaker' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Filmmaker Dashboard
                                </button>
                                <button
                                    onClick={() => setActiveView('actor')}
                                    className={`flex items-center gap-2 py-3 px-4 font-semibold border-b-4 transition-colors ${activeView === 'actor' ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    Actor Portal
                                </button>
                            </div>
                        </div>
                    )}

                    {activeView === 'filmmaker' && user.isFilmmaker && <FilmmakerDashboardView />}
                    {activeView === 'actor' && user.isActor && <ActorPortalView />}

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