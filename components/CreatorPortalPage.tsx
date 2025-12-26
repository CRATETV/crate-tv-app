import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { Movie } from '../types';

const CreatorPortalPage: React.FC = () => {
    const [activeView, setActiveView] = useState<'filmmaker' | 'actor' | 'industry'>('filmmaker');
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
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">Manage your professional presence and access industry-only insights.</p>
                </div>
                
                <div className="max-w-6xl mx-auto px-4 pb-16">
                    <div className="flex justify-center mb-12">
                        <div className="inline-flex p-1 bg-gray-900 border border-gray-800 rounded-xl">
                            <button 
                                onClick={() => setActiveView('filmmaker')}
                                className={`px-6 md:px-8 py-3 rounded-lg font-bold transition-all text-xs md:text-base ${activeView === 'filmmaker' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Filmmakers
                            </button>
                            <button 
                                onClick={() => setActiveView('actor')}
                                className={`px-6 md:px-8 py-3 rounded-lg font-bold transition-all text-xs md:text-base ${activeView === 'actor' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Actors
                            </button>
                            <button 
                                onClick={() => setActiveView('industry')}
                                className={`px-6 md:px-8 py-3 rounded-lg font-bold transition-all text-xs md:text-base ${activeView === 'industry' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Industry Pros
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={`bg-gray-900/50 border p-8 rounded-2xl transition-colors ${activeView === 'industry' ? 'border-green-900/50' : 'border-gray-800'}`}>
                            <h2 className="text-2xl font-bold mb-4">
                                {activeView === 'filmmaker' && 'Filmmaker Hub'}
                                {activeView === 'actor' && 'Actor Hub'}
                                {activeView === 'industry' && 'Industry Intelligence Terminal'}
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                {activeView === 'filmmaker' && 'Access your personalized dashboard to track film views, manage donations, and request earnings payouts.'}
                                {activeView === 'actor' && 'Update your public headshots, manage your professional bio, and connect with the community in the Green Room.'}
                                {activeView === 'industry' && 'A high-density data suite for talent agents and distributors. Real-time audience retention maps, discovery scores, and traffic heatmaps.'}
                            </p>
                            <div className="space-y-4">
                                {activeView === 'industry' ? (
                                    <a 
                                        href="mailto:cratetiv@gmail.com?subject=Industry Access Request"
                                        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl transition-transform hover:scale-[1.02] shadow-xl shadow-green-900/20"
                                    >
                                        Request Access Key
                                    </a>
                                ) : (
                                    <a 
                                        href={activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup'}
                                        onClick={(e) => handleNavigate(e, activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup')}
                                        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition-transform hover:scale-[1.02]"
                                    >
                                        Register Account
                                    </a>
                                )}
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
                            <h3 className="font-bold text-lg mb-4">Verification Policy</h3>
                            <ul className="space-y-4 text-gray-400 text-sm">
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>Professional visibility is strictly guarded. Analytics are only visible to the film's verified owner.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>Industry Terminal access requires proof of professional affiliation (Agent/Distributor).</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-red-500 font-bold">✓</span>
                                    <span>User privacy is our priority. Audience data is anonymized and aggregated for analytics.</span>
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