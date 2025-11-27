
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
// FIX: Corrected import path for Movie type
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
        <div className="flex flex-col min-h-screen text-white">
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={false}
            />
            <main className="flex-grow pb-24 md:pb-0">
                {/* Static Hero Section - Fast Loading */}
                <div 
                    className="relative w-full h-[56.25vw] max-h-[70vh] bg-black bg-cover bg-center"
                    style={{ backgroundImage: `url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg')`}}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/80"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
                    <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 text-white">
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 max-w-xl drop-shadow-lg">
                            Creator Portals
                        </h1>
                        <p className="text-sm md:text-base lg:text-lg max-w-xl mb-6">
                            Access your dashboard, manage your profile, and connect with the Crate TV community.
                        </p>
                    </div>
                </div>
                
                <div className="relative z-10 mt-12 px-4 pb-16">
                    <div className="max-w-xl w-full mx-auto text-center">
                        <div className="bg-black/70 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
                            {/* Toggle Switch */}
                            <div className="flex p-2 bg-gray-800/50">
                                <button 
                                    onClick={() => setActiveView('filmmaker')}
                                    className={`flex-1 py-3 text-lg font-bold transition-colors duration-300 rounded-lg ${activeView === 'filmmaker' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                >
                                    Filmmaker
                                </button>
                                <button 
                                    onClick={() => setActiveView('actor')}
                                    className={`flex-1 py-3 text-lg font-bold transition-colors duration-300 rounded-lg ${activeView === 'actor' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                >
                                    Actor
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                {activeView === 'filmmaker' ? (
                                    <div className="animate-[fadeIn_0.5s_ease-out]">
                                        <h2 className="text-4xl font-bold text-white mb-4">Filmmaker Dashboard</h2>
                                        <p className="text-gray-300 mb-8">
                                            Access performance analytics, track revenue, and manage payouts.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            <a 
                                                href="/filmmaker-signup" 
                                                onClick={(e) => handleNavigate(e, '/filmmaker-signup')}
                                                className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                            >
                                                Request Access
                                            </a>
                                            <a 
                                                href="/login?redirect=/filmmaker-dashboard" 
                                                onClick={(e) => handleNavigate(e, '/login?redirect=/filmmaker-dashboard')}
                                                className="flex-1 text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                            >
                                                Login
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-[fadeIn_0.5s_ease-out]">
                                        <h2 className="text-4xl font-bold text-white mb-4">Actor Portal</h2>
                                        <p className="text-gray-300 mb-8">
                                            Update your public profile, and connect with other actors in the Green Room.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            <a 
                                                href="/actor-signup" 
                                                onClick={(e) => handleNavigate(e, '/actor-signup')}
                                                className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                            >
                                                Request Access
                                            </a>
                                            <a 
                                                href="/login?redirect=/actor-portal" 
                                                onClick={(e) => handleNavigate(e, '/login?redirect=/actor-portal')}
                                                className="flex-1 text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
                                            >
                                                Login
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <CollapsibleFooter showActorLinks={true} />
            <BottomNavBar 
                onSearchClick={handleMobileSearch}
            />
        </div>
    );
};

export default CreatorPortalPage;
