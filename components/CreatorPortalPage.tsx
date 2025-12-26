import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { Movie } from '../types';

const CreatorPortalPage: React.FC = () => {
    const [activeView, setActiveView] = useState<'filmmaker' | 'actor'>('filmmaker');
    const { movies } = useFestival();
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={false}
            />
            <main className="flex-grow pb-24 md:pb-0">
                <div className="relative py-24 md:py-32 text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">Creator Portals</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">Manage your professional presence on Crate TV.</p>
                </div>
                
                <div className="max-w-4xl mx-auto px-4 pb-16">
                    <div className="flex justify-center mb-12">
                        <div className="inline-flex p-1 bg-gray-900 border border-gray-800 rounded-xl">
                            <button 
                                onClick={() => setActiveView('filmmaker')}
                                className={`px-8 py-3 rounded-lg font-bold transition-all ${activeView === 'filmmaker' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Filmmakers
                            </button>
                            <button 
                                onClick={() => setActiveView('actor')}
                                className={`px-8 py-3 rounded-lg font-bold transition-all ${activeView === 'actor' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Actors
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-2xl">
                            <h2 className="text-2xl font-bold mb-4">{activeView === 'filmmaker' ? 'Filmmaker Hub' : 'Actor Hub'}</h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                {activeView === 'filmmaker' 
                                    ? 'Access your personalized dashboard to track film views, manage donations, and request earnings payouts.' 
                                    : 'Update your public headshots, manage your professional bio, and connect with the community in the Green Room.'}
                            </p>
                            <div className="space-y-4">
                                <a 
                                    href={activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup'}
                                    onClick={(e) => handleNavigate(e, activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup')}
                                    className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-transform hover:scale-[1.02]"
                                >
                                    Register Account
                                </a>
                                <a 
                                    href="/login?redirect=/portal"
                                    onClick={(e) => handleNavigate(e, '/login?redirect=/portal')}
                                    className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl"
                                >
                                    Existing User Login
                                </a>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 p-8 rounded-2xl flex flex-col justify-center">
                            <h3 className="font-bold text-lg mb-4">Why create a profile?</h3>
                            <ul className="space-y-4 text-gray-400 text-sm">
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>Professional visibility in our searchable directory.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>Direct connection with independent cinema audiences.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>Real-time tracking of engagement and earnings.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default CreatorPortalPage;