
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
        window.scrollTo(0,0);
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
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-red-600">
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={false}
            />
            <main className="flex-grow pb-24 md:pb-0">
                <div className="relative py-24 md:py-32 text-center px-4 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/5 blur-[150px] pointer-events-none"></div>
                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] mb-4">Official Infrastructure</p>
                    <h1 className="text-5xl md:text-9xl font-black uppercase tracking-tighter leading-none italic mb-4">Portals.</h1>
                    <p className="text-gray-400 max-w-xl mx-auto text-lg md:text-xl font-medium leading-relaxed">Secure interfaces for filmmakers, talent, and distribution partners.</p>
                </div>
                
                <div className="max-w-6xl mx-auto px-4 pb-16">
                    <div className="flex justify-center mb-16">
                        <div className="inline-flex p-1.5 bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-2xl">
                            <button 
                                onClick={() => setActiveView('filmmaker')}
                                className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeView === 'filmmaker' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Filmmakers
                            </button>
                            <button 
                                onClick={() => setActiveView('actor')}
                                className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeView === 'actor' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Actors
                            </button>
                            <button 
                                onClick={() => setActiveView('industry')}
                                className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeView === 'industry' ? 'bg-green-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Industry
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className={`bg-[#0a0a0a] border p-10 rounded-[3rem] transition-all duration-500 shadow-2xl flex flex-col justify-between ${activeView === 'industry' ? 'border-green-900/50' : 'border-white/5'}`}>
                            <div className="space-y-6">
                                <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                                    {activeView === 'filmmaker' && 'Filmmaker Hub'}
                                    {activeView === 'actor' && 'Actor Hub'}
                                    {activeView === 'industry' && 'Industry Terminal'}
                                </h2>
                                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                                    {activeView === 'filmmaker' && 'Claim your creator identity to monitor audience heatmaps, handle direct community support, and manage global exhibit logs.'}
                                    {activeView === 'actor' && 'Manage your professional directory listing. Synchronize high-res headshots and bios across the web and Roku ecosystem.'}
                                    {activeView === 'industry' && 'A proprietary data suite for verified talent agents and distributors. Real-time telemetry, sentiment analysis, and talent discovery co-efficients.'}
                                </p>
                            </div>
                            <div className="space-y-4 mt-12">
                                {activeView === 'industry' ? (
                                    <a 
                                        href="mailto:studio@cratetv.net?subject=Industry Access Request"
                                        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl transition-all transform hover:scale-[1.02] shadow-xl shadow-green-900/20 uppercase tracking-widest text-xs"
                                    >
                                        Request Access Key
                                    </a>
                                ) : (
                                    <a 
                                        href={activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup'}
                                        onClick={(e) => handleNavigate(e, activeView === 'filmmaker' ? '/filmmaker-signup' : '/actor-signup')}
                                        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl transition-all transform hover:scale-[1.02] shadow-xl shadow-red-900/40 uppercase tracking-widest text-xs"
                                    >
                                        Verify Identity
                                    </a>
                                )}
                                <a 
                                    href="/login?redirect=/portal"
                                    onClick={(e) => handleNavigate(e, '/login?redirect=/portal')}
                                    className="block w-full text-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs border border-white/5 transition-all"
                                >
                                    Log In to Verified Node
                                </a>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] flex flex-col justify-center space-y-8">
                            <h3 className="font-black text-xl uppercase tracking-tighter italic">Operational Policies</h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-6 h-6 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-bold text-xs flex-shrink-0 mt-1">✓</div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase">Encryption Integrity</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">Your professional telemetry is strictly guarded. Analytics are only visible to the verified owner of the content.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-6 h-6 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-bold text-xs flex-shrink-0 mt-1">✓</div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase">Vetting Protocol</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">Actor profiles and Filmmaker dashboards require specific crediential alignment with our master database.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-6 h-6 bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-500 font-bold text-xs flex-shrink-0 mt-1">✓</div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase">Global Presence</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">Changes to your professional bio or headshots propagate to our Roku SDK and web endpoints in real-time.</p>
                                    </div>
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
