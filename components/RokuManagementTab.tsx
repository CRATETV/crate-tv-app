
import React, { useState } from 'react';
import { Movie } from '../types';
import RokuRowManager from './RokuRowManager';
import RokuHeroManager from './RokuHeroManager';
import RokuContentFilter from './RokuContentFilter';
import RokuAssetManager from './RokuAssetManager';
import RokuPreviewTab from './RokuPreviewTab';
import RokuDeployTab from './RokuDeployTab';
import RokuDiagnostics from './RokuDiagnostics';
import { useRokuConfig } from '../hooks/useRokuConfig';

interface RokuManagementTabProps {
    allMovies: Movie[];
    onSaveMovie: (movie: Movie) => Promise<void>;
}

const RokuManagementTab: React.FC<RokuManagementTabProps> = ({ allMovies, onSaveMovie }) => {
    const [activeTab, setActiveTab] = useState<'rows' | 'hero' | 'content' | 'assets' | 'preview' | 'deploy' | 'diag' | 'forge'>('rows');
    const { config, loading, error, saveConfig, showAllContent } = useRokuConfig();

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out] pb-24">
            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Roku Control Center</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Architecture Level: Netflix Parity V4.1</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
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
                    { id: 'forge', label: '🔮 Roku Forge', color: 'bg-amber-600' },
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
                {activeTab === 'deploy' && <RokuDeployTab />}
                {activeTab === 'forge' && (
                    <div className="space-y-8 max-w-5xl mx-auto">
                        <div className="bg-amber-600/10 border border-amber-500/20 p-10 rounded-[3rem] space-y-6">
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Roku Forge Logic</h3>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Use the prompt below with <strong className="text-white">Claude 3.5 Sonnet</strong> or <strong className="text-white">Gemini 2.0 Flash</strong> to generate the BrightScript logic for your custom Roku Channel.
                            </p>
                            <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-xs text-amber-500 overflow-y-auto max-h-64 select-all cursor-pointer" onClick={() => {
                                navigator.clipboard.writeText("Paste the long prompt here...");
                                alert("Prompt manifest copied to clipboard.");
                            }}>
                                [MANIFEST_UPLINK_PROMPT_CORE_V4_STABLE...]
                                <br/><br/>
                                ROLE: Senior Embedded Roku Architect...
                                <br/>
                                OBJECTIVE: Create Netflix-style SceneGraph...
                                <br/>
                                TARGET_API: https://cratetv.net/api/roku-feed
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                                <h4 className="text-white font-black uppercase text-xs mb-4">Architecture Map</h4>
                                <ul className="space-y-3 text-sm text-gray-500 font-mono">
                                    <li className="flex gap-2"><span>├─</span> <span className="text-indigo-400">manifest</span> (Brand Config)</li>
                                    <li className="flex gap-2"><span>├─</span> <span className="text-red-400">MainScene</span> (View Logic)</li>
                                    <li className="flex gap-2"><span>├─</span> <span className="text-purple-400">ContentTask</span> (API Relay)</li>
                                    <li className="flex gap-2"><span>└─</span> <span className="text-green-400">VideoPlayer</span> (HLS Engine)</li>
                                </ul>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center text-center">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Channel Status</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">Ready for Signing</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RokuManagementTab;
