
import React, { useState } from 'react';
import { Movie } from '../types';
import RokuRowManager from './RokuRowManager';
import RokuHeroManager from './RokuHeroManager';
import RokuContentFilter from './RokuContentFilter';
import RokuAssetManager from './RokuAssetManager';
import RokuPreviewTab from './RokuPreviewTab';
import RokuDeployTab from './RokuDeployTab';
import { useRokuConfig } from '../hooks/useRokuConfig';

interface RokuManagementTabProps {
    allMovies: Movie[];
    onSaveMovie: (movie: Movie) => Promise<void>;
}

const RokuManagementTab: React.FC<RokuManagementTabProps> = ({ allMovies, onSaveMovie }) => {
    const [activeTab, setActiveTab] = useState<'rows' | 'hero' | 'content' | 'assets' | 'preview' | 'deploy'>('rows');
    const { config, loading, error, saveConfig, showAllContent } = useRokuConfig();

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 animate-[fadeIn_0.4s_ease-out] pb-24">
            {/* Header / Stats Bar */}
            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Roku Control Center</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Bulletproof Infrastructure // V4.1</p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={showAllContent}
                        className="bg-white/5 border border-white/10 text-gray-500 hover:text-white font-black px-6 py-3 rounded-2xl uppercase tracking-widest text-[10px] transition-all"
                    >
                        Emergency: Show All
                    </button>
                    <div className="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Feed v{config._version || 1} Stable</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-black border border-white/5 rounded-2xl w-max mx-auto shadow-2xl">
                {[
                    { id: 'rows', label: '📂 Row Manager', color: 'bg-indigo-600' },
                    { id: 'hero', label: '⭐ Hero Carousel', color: 'bg-red-600' },
                    { id: 'content', label: '🛡️ Content Rules', color: 'bg-amber-600' },
                    { id: 'assets', label: '🖼️ Assets & Overrides', color: 'bg-purple-600' },
                    { id: 'preview', label: '🧪 Feed Preview', color: 'bg-emerald-600' },
                    { id: 'deploy', label: '🚀 Deployment', color: 'bg-white text-black' }
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

            {error && (
                <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-[2.5rem] text-center animate-shake">
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs">Sync Failure: {error}</p>
                </div>
            )}

            {/* Tab Panels */}
            <div className="animate-[fadeIn_0.5s_ease-out]">
                {activeTab === 'rows' && <RokuRowManager />}
                {activeTab === 'hero' && <RokuHeroManager allMovies={allMovies} />}
                {activeTab === 'content' && <RokuContentFilter allMovies={allMovies} />}
                {activeTab === 'assets' && <RokuAssetManager allMovies={allMovies} />}
                {activeTab === 'preview' && <RokuPreviewTab />}
                {activeTab === 'deploy' && <RokuDeployTab />}
            </div>
        </div>
    );
};

export default RokuManagementTab;
