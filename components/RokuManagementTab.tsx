
import React, { useState, useEffect } from 'react';
import { Movie, Category, RokuConfig } from '../types';
import { getDbInstance } from '../services/firebaseClient';
import HeroImageManager from './HeroImageManager';
import RokuCategoryManager from './RokuCategoryManager';
import FeaturedCarousel from './FeaturedCarousel';
import LiveStreamControl from './LiveStreamControl';
import RokuStreamManager from './RokuStreamManager';
import RokuDeployTab from './RokuDeployTab';

interface RokuManagementTabProps {
    allMovies: Movie[];
    onSaveMovie: (movie: Movie) => Promise<void>;
}

const RokuManagementTab: React.FC<RokuManagementTabProps> = ({ allMovies, onSaveMovie }) => {
    const [activeSection, setActiveSection] = useState<'assets' | 'stream' | 'featured' | 'categories' | 'live' | 'deploy'>('assets');
    const [rokuConfig, setRokuConfig] = useState<RokuConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        const unsub = db.collection('content').doc('roku_config').onSnapshot(doc => {
            if (doc.exists) {
                setRokuConfig(doc.data() as RokuConfig);
            } else {
                // Initialize default config if missing
                const defaults: RokuConfig = {
                    featuredKeys: [],
                    visibleCategoryKeys: ['newReleases', 'awardWinners'],
                    categoryOrder: ['newReleases', 'awardWinners'],
                    isFestivalModeActive: false
                };
                setRokuConfig(defaults);
            }
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSaveConfig = async (newConfig: Partial<RokuConfig>) => {
        const db = getDbInstance();
        if (!db) return;
        await db.collection('content').doc('roku_config').set(newConfig, { merge: true });
        alert("Roku System Manifest Synchronized.");
    };

    if (isLoading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-10 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex flex-wrap gap-2 p-1.5 bg-black border border-white/5 rounded-2xl w-max mx-auto shadow-2xl">
                <button 
                    onClick={() => setActiveSection('assets')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'assets' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    🖼️ Assets
                </button>
                <button 
                    onClick={() => setActiveSection('stream')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'stream' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    🧬 Optimization
                </button>
                <button 
                    onClick={() => setActiveSection('featured')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'featured' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    ⭐ Featured
                </button>
                <button 
                    onClick={() => setActiveSection('categories')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    📂 Rows
                </button>
                <button 
                    onClick={() => setActiveSection('live')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'live' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    🛰️ Live
                </button>
                <button 
                    onClick={() => setActiveSection('deploy')} 
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'deploy' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    🚀 Deploy
                </button>
            </div>

            <div className="animate-[fadeIn_0.5s_ease-out]">
                {activeSection === 'assets' && <HeroImageManager allMovies={allMovies} onSave={onSaveMovie} />}
                {activeSection === 'stream' && <RokuStreamManager allMovies={allMovies} onSave={onSaveMovie} />}
                {activeSection === 'featured' && rokuConfig && <FeaturedCarousel allMovies={allMovies} featuredKeys={rokuConfig.featuredKeys} onSave={(keys) => handleSaveConfig({ featuredKeys: keys })} />}
                {activeSection === 'categories' && rokuConfig && <RokuCategoryManager config={rokuConfig} onSave={handleSaveConfig} />}
                {activeSection === 'live' && <LiveStreamControl allMovies={allMovies} onSave={onSaveMovie} />}
                {activeSection === 'deploy' && <RokuDeployTab />}
            </div>
        </div>
    );
};

export default RokuManagementTab;
