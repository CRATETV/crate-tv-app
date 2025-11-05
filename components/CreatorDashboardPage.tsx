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

const MonetizationTab: React.FC = () => {
    const [adTagUrl, setAdTagUrl] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

    useEffect(() => {
        const savedUrl = localStorage.getItem('productionAdTagUrl');
        if (savedUrl) {
            setAdTagUrl(savedUrl);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('productionAdTagUrl', adTagUrl);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 p-6 md:p-8 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Monetization Settings</h2>
            <p className="text-gray-400 mb-6">
                This is where you activate real revenue generation. Paste your production video ad tag URL from your Google AdSense or Ad Manager account below.
            </p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="adTagUrl" className="block text-sm font-medium text-gray-400 mb-2">
                        Production Ad Tag URL
                    </label>
                    <textarea
                        id="adTagUrl"
                        value={adTagUrl}
                        onChange={(e) => setAdTagUrl(e.target.value)}
                        className="form-input w-full font-mono text-sm"
                        rows={4}
                        placeholder="https://googleads.g.doubleclick.net/pagead/ads?..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Your ad tag is saved securely in your browser and is never exposed in the code. Need help finding this? 
                        <a href="https://support.google.com/admanager/answer/1068325" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline ml-1">
                            Learn more at Google.
                        </a>
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className="submit-btn bg-green-600 hover:bg-green-700"
                >
                    Save & Activate Ads
                </button>
                {saveStatus === 'success' && (
                    <p className="text-green-400 text-sm">
                        Ad Tag URL saved! Your films will now serve production ads.
                    </p>
                )}
            </div>
        </div>
    );
};


const CreatorDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { movies } = useFestival();
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default to the most "active" role (filmmaker > actor), or whichever they have.
    const defaultView = user?.isFilmmaker ? 'filmmaker' : 'actor';
    const [activeView, setActiveView] = useState(defaultView);
    
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
                     <div className="flex items-center gap-4 mb-8">
                        <h1 className="text-4xl font-bold text-white">Welcome, {user.name}</h1>
                        {isDualRole && (
                             <select 
                                value={activeView} 
                                onChange={(e) => setActiveView(e.target.value)}
                                className="form-input !w-auto bg-gray-800 border-gray-600"
                             >
                                <option value="filmmaker">Filmmaker Dashboard</option>
                                <option value="actor">Actor Portal</option>
                             </select>
                        )}
                    </div>

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