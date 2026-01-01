import React, { useState, useEffect } from 'react';
import { CrateFestConfig, Movie } from '../types';

interface CrateFestEditorProps {
    config: CrateFestConfig;
    allMovies: Record<string, Movie>;
    onSave: (config: CrateFestConfig) => Promise<void>;
    isSaving: boolean;
}

const CrateFestEditor: React.FC<CrateFestEditorProps> = ({ config: initialConfig, allMovies, onSave, isSaving }) => {
    const [config, setConfig] = useState<CrateFestConfig>(initialConfig);
    const [searchTerm, setSearchTerm] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) : value)
        }));
    };

    const addBlock = () => {
        setConfig(prev => ({
            ...prev,
            movieBlocks: [...prev.movieBlocks, { title: 'New Category', movieKeys: [] }]
        }));
    };

    const updateBlock = (idx: number, updates: any) => {
        const newBlocks = [...config.movieBlocks];
        newBlocks[idx] = { ...newBlocks[idx], ...updates };
        setConfig({ ...config, movieBlocks: newBlocks });
    };

    const filteredMovies = (Object.values(allMovies) as Movie[]).filter(m => 
        (m.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => (a.title || '').localeCompare(b.title || ''));

    return (
        <div className="space-y-10 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Crate Fest Control</h3>
                    <p className="text-gray-400 mt-2">Manage the dynamic paywall event and the discovery block mapping.</p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">LIVE STATUS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            name="isActive" 
                            checked={config.isActive} 
                            onChange={(e) => setConfig({...config, isActive: e.target.checked})} 
                            className="sr-only peer" 
                        />
                        <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <section className="bg-[#0f0f0f] p-8 rounded-3xl border border-white/5 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Global Config</h4>
                    <div className="space-y-4">
                        <input name="title" value={config.title} onChange={handleChange} placeholder="Festival Title" className="form-input bg-black/40" />
                        <textarea name="tagline" value={config.tagline} onChange={handleChange} placeholder="Tagline" className="form-input bg-black/40" rows={2} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Start Date</label>
                                <input type="datetime-local" name="startDate" value={config.startDate?.slice(0, 16)} onChange={handleChange} className="form-input bg-black/40" />
                            </div>
                            <div>
                                <label className="form-label">End Date</label>
                                <input type="datetime-local" name="endDate" value={config.endDate?.slice(0, 16)} onChange={handleChange} className="form-input bg-black/40" />
                            </div>
                        </div>
                        <div className="p-6 bg-red-600/5 border border-red-500/10 rounded-2xl">
                            <label className="form-label !text-red-500">Pass Price (USD)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input 
                                    type="number" 
                                    name="passPrice" 
                                    value={config.passPrice} 
                                    onChange={handleChange} 
                                    className="form-input !pl-8 bg-black/40 text-green-500 font-black text-2xl" 
                                    step="1"
                                />
                            </div>
                            <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-3">This price applies to the "Crate Fest All-Access" digital pass.</p>
                        </div>
                        <div>
                            <label className="form-label">Kickoff Watch Party Movie Key</label>
                            <input name="featuredWatchPartyKey" value={config.featuredWatchPartyKey} onChange={handleChange} placeholder="e.g. fighter" className="form-input bg-black/40" />
                        </div>
                    </div>
                </section>

                <section className="bg-[#0f0f0f] p-8 rounded-3xl border border-white/5 space-y-8">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">02. Discovery Blocks</h4>
                        <button onClick={addBlock} className="bg-white/10 hover:bg-white/20 text-white font-black px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all">Add Block</button>
                    </div>
                    
                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {config.movieBlocks.map((block, bIdx) => (
                            <div key={bIdx} className="bg-black/60 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <input 
                                        value={block.title} 
                                        onChange={(e) => updateBlock(bIdx, { title: e.target.value })} 
                                        className="bg-transparent border-b border-white/10 text-white font-bold focus:outline-none focus:border-red-500" 
                                    />
                                    <button onClick={() => {
                                        const next = [...config.movieBlocks];
                                        next.splice(bIdx, 1);
                                        setConfig({...config, movieBlocks: next});
                                    }} className="text-gray-700 hover:text-red-500 text-[9px] font-black uppercase tracking-widest">Delete</button>
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase font-black">{block.movieKeys.length} films mapped</div>
                                <div className="flex flex-wrap gap-2">
                                    {block.movieKeys.map(k => (
                                        <div key={k} className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-2">
                                            {allMovies[k]?.title || k}
                                            <button onClick={() => {
                                                const nextKeys = block.movieKeys.filter(key => key !== k);
                                                updateBlock(bIdx, { movieKeys: nextKeys });
                                            }}>&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Quick add by key..." 
                                        className="form-input !bg-white/5 !py-2 text-[10px]" 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (allMovies[val]) {
                                                    updateBlock(bIdx, { movieKeys: [...block.movieKeys, val] });
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="pt-10 border-t border-white/5 flex justify-center">
                <button 
                    onClick={() => onSave(config)} 
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-20 py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-95 disabled:opacity-20"
                >
                    {isSaving ? 'Synchronizing Cluster...' : 'Push Crate Fest Manifest'}
                </button>
            </div>
        </div>
    );
};

export default CrateFestEditor;