
import React, { useState } from 'react';
import { Movie } from '../types';
import RokuRowManager from './RokuRowManager';
import RokuHeroManager from './RokuHeroManager';
import RokuAssetManager from './RokuAssetManager';
import RokuStreamManager from './RokuStreamManager';
import RokuPreviewTab from './RokuPreviewTab';
import RokuDeployTab from './RokuDeployTab';
import { useRokuConfig } from '../hooks/useRokuConfig';

interface RokuManagementTabProps {
    allMovies: Movie[];
    onSaveMovie: (movie: Movie) => Promise<void>;
}

const RokuManagementTab: React.FC<RokuManagementTabProps> = ({ allMovies, onSaveMovie }) => {
    const [activeTab, setActiveTab] = useState<'rows' | 'hero' | 'assets' | 'stream' | 'preview' | 'deploy' | 'forge'>('rows');
    const { config, loading, saveConfig } = useRokuConfig();

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-24">
            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Roku Control Center</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Architecture Level: V4.5 Hardware Sync</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Feed Sync Active</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-1.5 bg-black border border-white/5 rounded-2xl w-max mx-auto shadow-2xl">
                {[
                    { id: 'rows', label: '📂 Rows', color: 'bg-indigo-600' },
                    { id: 'hero', label: '⭐ Spotlight', color: 'bg-red-600' },
                    { id: 'assets', label: '🖼️ Art', color: 'bg-purple-600' },
                    { id: 'stream', label: '⚡ Compatibility', color: 'bg-cyan-600' },
                    { id: 'deploy', label: '🚀 Deploy', color: 'bg-white text-black' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'text-gray-500 hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-[fadeIn_0.5s_ease-out]">
                {activeTab === 'rows' && <RokuRowManager />}
                {activeTab === 'hero' && <RokuHeroManager allMovies={allMovies} />}
                {activeTab === 'assets' && <RokuAssetManager allMovies={allMovies} />}
                {activeTab === 'stream' && <RokuStreamManager allMovies={allMovies} onSave={onSaveMovie} />}
                {activeTab === 'deploy' && <RokuDeployTab />}
            </div>
        </div>
    );
};

export default RokuManagementTab;
